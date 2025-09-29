use hl_core::{
    Policy, Rhex, error, keymaster::keymaster::Keymaster, policy::rule::Rule,
    rhex::record_types::is_valid_record_type, time::clock::GTClock,
};
use hl_io::db;
use rusqlite::Connection;

use crate::process::{
    data::get_data_string,
    processor::{errors::Errors, schema::get_schema},
};
use once_cell::sync::Lazy;
use regex::Regex;

/// Validate the `magic` value of the Rhex
pub fn validate_magic(rhex: &Rhex, errors: &mut Errors) -> Result<(), anyhow::Error> {
    if rhex.magic != *b"RHEX\x00\x00" {
        errors.push(error::E_MAGIC_BAD, "Invalid magic value");
        return Err(anyhow::anyhow!("Invalid magic value"));
    }
    Ok(())
}

/// Validate that the `previous_hash` in the intent matches the current head of the scope
pub fn validate_intent_previous_hash(
    rhex: &Rhex,
    current_hash: [u8; 32],
    errors: &mut Errors,
) -> Result<(), anyhow::Error> {
    if rhex.intent.previous_hash.is_none()
        && rhex.intent.record_type != "scope:genesis"
        && !rhex.intent.record_type.starts_with("request:")
    {
        errors.push(
            error::E_PREVIOUS_HASH_MISSING,
            "rhex.intent.previous_hash missing",
        );
        return Err(anyhow::anyhow!("rhex.intent.previous_hash missing"));
    }
    // NOTE: This needs to be set up to handle scope:genesis and
    // request:* because those never have a previous hash

    if rhex.intent.previous_hash.is_none() {
        return Ok(());
    }

    let prev_hash = rhex.intent.previous_hash.unwrap();
    if prev_hash != current_hash {
        errors.push(
            error::E_CHAIN_BREAK_PREV_MISMATCH,
            "rhex.intent.previous_hash does not match head",
        );
        return Err(anyhow::anyhow!(
            "rhex.intent.previous_hash does not match head"
        ));
    }
    Ok(())
}

/// Validate that the `scope` name is valid
static SCOPE_REGEX: Lazy<Regex> = Lazy::new(|| {
    regex::Regex::new(
        r"^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,62}[a-zA-Z0-9])?)(?:\.(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,62}[a-zA-Z0-9])?))*$"
    ).expect("Invalid scope regex")
});

/// Verify scope name is valid via regex
fn scope_regex(scope: &str) -> bool {
    if scope.is_empty() {
        return true; // root scope is valid
    }
    if scope.len() > 65535 {
        return false;
    }
    SCOPE_REGEX.is_match(scope)
}

/// Validate that the `scope` name is valid
pub fn validate_intent_scope(rhex: &Rhex, errors: &mut Errors) -> Result<(), anyhow::Error> {
    if !scope_regex(&rhex.intent.scope) {
        errors.push(error::E_SCOPE_NAME_INVALID, "rhex.intent.scope invalid");
        return Err(anyhow::anyhow!("rhex.intent.scope invalid"));
    }
    Ok(())
}

/// Validate that the `nonce` is the correct length and has not been used before
pub fn validate_intent_nonce(
    rhex: &Rhex,
    errors: &mut Errors,
    cache: &Connection,
) -> Result<(), anyhow::Error> {
    if rhex.intent.nonce.len() != 16 {
        errors.push(
            error::E_NONCE_UNAVALIBLE,
            "rhex.intent.nonce invalid length",
        );
        return Err(anyhow::anyhow!("rhex.intent.nonce invalid length"));
    }
    let nonce = rhex.intent.nonce.clone();
    let status = db::rhex::check_nonce(&cache, rhex.intent.scope.as_str(), &nonce);
    if status.is_err() {
        errors.push(
            error::E_NONCE_REUSED,
            "rhex.intent.nonce has already been used",
        );
        return Err(anyhow::anyhow!("rhex.intent.nonce has already been used"));
    }
    Ok(())
}

/// Validate that the `author_pk` is valid
pub fn validate_intent_author_pk(rhex: &Rhex, errors: &mut Errors) -> Result<(), anyhow::Error> {
    // We actually check the key for valid append in validate_intent_record_type.
    // Here we are just making sure it's non-zero.
    if rhex.intent.author_pk == [0u8; 32] {
        errors.push(
            error::E_AUTHOR_KEY_DECODE,
            "rhex.intent.author_pk missing or invalid",
        );
        return Err(anyhow::anyhow!("rhex.intent.author_pk missing or invalid"));
    }
    Ok(())
}

/// Validate that the `usher_pk` is valid
pub fn validate_intent_usher_pk(
    rhex: &Rhex,
    errors: &mut Errors,
    keymaster: &Keymaster,
    cache: &Connection,
) -> Result<(), anyhow::Error> {
    if rhex.intent.usher_pk == [0u8; 32] {
        errors.push(error::E_USHER_KEY_DECODE, "rhex.intent.usher_pk invalid");
        return Err(anyhow::anyhow!("rhex.intent.usher_pk invalid"));
    }
    // make sure we are either this key or a quorum member
    let is_us = keymaster.get_matching(&rhex.intent.usher_pk);
    if is_us.is_err() {
        let scope = db::scope::retrieve_scope(&cache, &rhex.intent.scope)?;
        for usher in scope.ushers {
            if usher.public_key == rhex.intent.usher_pk {
                return Ok(());
            }
        }
        errors.push(error::E_USHER_MISMATCH, "rhex.intent.usher_pk invalid");
        return Err(anyhow::anyhow!("rhex.intent.usher_pk invalid"));
    }
    if is_us.is_ok() {
        // We are the usher, so we are valid
        return Ok(());
    }
    Err(anyhow::anyhow!("rhex.intent.usher_pk not known"))
}

/// Validate that the `record_type` is valid
pub fn validate_intent_record_type(
    rhex: &Rhex,
    errors: &mut Errors,
    cache: &Connection,
) -> Result<(), anyhow::Error> {
    // validate that the author has permission to append this record type
    let valid = is_valid_record_type(&rhex.intent.record_type);
    if !valid {
        errors.push(
            error::E_RECORD_TYPE_UNKNOWN,
            "rhex.intent.record_type is not a valid record type",
        );
        return Err(anyhow::anyhow!(
            "rhex.intent.record_type is not a valid record type"
        ));
    };
    let policy = db::policy::retrieve_policy(&cache, &rhex.intent.scope);
    let policy = match policy {
        Ok(mut policy) => {
            let rules = db::rule::get_rules(cache, &rhex.intent.scope);
            if rules.is_err() {
                policy
            } else {
                policy.rules = rules.unwrap();
                policy
            }
        }
        Err(_) => {
            let mut rule = Rule::new(&rhex.intent.scope);
            rule.append_roles = vec!["authority".to_string()];
            rule.record_types = vec!["scope:genesis".to_string()];
            rule.quorum_k = 1;
            rule.quorum_roles = vec!["authority".to_string()];
            rule.rate_per_mark = 1;
            Policy {
                scope: rhex.intent.scope.clone(),
                quorum_ttl: 1000000000,
                eff: None,
                exp: None,
                note: Some("Default Scope Policy".to_string()),
                rules: vec![rule],
            }
        }
    };
    let record_type = &rhex.intent.record_type;
    let mut last_rule = None;
    for rule in policy.rules.iter() {
        if rule.append_roles == vec!["default"] {
            last_rule = Some(rule.clone());
            continue;
        }
        if rule.applies_to(record_type) {
            last_rule = Some(rule.clone());
        }
    }
    if last_rule.is_none() {
        errors.push(error::E_APPEND_DENIED, "Append denied based on rules");
        return Err(anyhow::anyhow!("Append denied based on rules"));
    }
    let last_rule = last_rule.unwrap();
    let rate_per_mark = last_rule.rate_per_mark;
    let last_append = db::rhex::get_last_append(
        &cache,
        &rhex.intent.scope,
        &rhex.intent.author_pk,
        record_type,
    )?;
    if last_append.is_some() {
        // The author has previously submitted a R⬢, make sure this
        // one isn't too soon.
        let last_append = last_append.unwrap();
        let clock = GTClock::new(0);
        if clock.now_micromarks_u64() - last_append.0 < rate_per_mark.into() {
            errors.push(
                error::E_RATE_LIMITED,
                format!(
                    "Rate limit exceeded. Must wait {} micromarks between appends of type {}",
                    rate_per_mark, record_type
                ),
            );
            return Err(anyhow::anyhow!("Rate limit exceeded"));
        }
    };
    Ok(())
}

/// Validate intent `data` based off schema
pub fn validate_intent_data(rhex: &Rhex, errors: &mut Errors) -> Result<(), anyhow::Error> {
    // TODO: Validate via schema
    // I'm tired as fuck and this doesn't affect append so we're skipping
    // it for now.
    let schema = get_data_string(rhex, &vec!["sch".to_string(), "schema".to_string()]);
    // If an error, that just means we have no schema, which is fine
    if schema.is_err() {
        return Ok(());
    }
    let schema = schema.unwrap();

    // Load schema from cache
    let loaded_schema = get_schema(&schema);
    if loaded_schema.is_err() {
        // FIXME: This is kind of an area of contention. Should schema
        // silently fail? It kind of has to until we get the schema
        // scope fully populated.
    } else {
        // Verify the schema we did get.
        let loaded_schema = loaded_schema.unwrap();
        for constraint in loaded_schema.constraints {
            let data_value = rhex.intent.data.get(constraint.name.clone());
            if constraint.required == 1 && data_value.is_none() {
                errors.push(
                    error::E_SCHEMA_CONSTRAINT_VIOLATION,
                    format!(
                        "Schema constraint violation: {} is required",
                        constraint.name
                    ),
                );
                return Err(anyhow::anyhow!(
                    "Schema constraint violation: {} is required",
                    constraint.name
                ));
            } else if constraint.required == 0 && data_value.is_none() {
                // Not required, so it's fine if it's missing
                continue;
            } else if constraint.required == 0 && data_value.is_some() {
                // Not required, but present. Validate it.
                // TODO: Add type validation here
                continue;
            } else if constraint.required == 1 && data_value.is_some() {
                // Required and present. Validate it.
                // TODO: Add type validation here
            }
        }
    }

    Ok(())
}

/// Validate context at - this is if we are seeking quorum because
/// otherwise we provide `at`.
pub fn validate_context_at(
    rhex: &Rhex,
    errors: &mut Errors,
    cache: &Connection,
    first_time: bool,
) -> Result<(), anyhow::Error> {
    // If we are looking for quorum we give a shit, otherwise, keep moving
    if rhex.signatures.len() > 2 && first_time {
        let policy = db::policy::retrieve_policy(&cache, &rhex.intent.scope)?;
        let quorum_ttl = policy.quorum_ttl;
        let clock = GTClock::new(0);
        if clock.now_micromarks_u64() - rhex.context.at > quorum_ttl {
            errors.push(
                error::E_TIME_WINDOW_EXPIRED,
                format!(
                    "Quorum TTL exceeded. Must be signed within {} micromarks. {} micromarks have passed.",
                    quorum_ttl,
                    clock.now_micromarks_u64() - rhex.context.at
                ),
            );
            return Err(anyhow::anyhow!("Quorum TTL exceeded"));
        }
    } else if rhex.signatures.len() == 1 && first_time {
        // If it's the first signature, we set the `at` field.
        // We don't validate it.
        // This is where the `at` field is set.
    } else if rhex.context.at == 0
        && rhex.intent.scope != "scope:genesis"
        && rhex.intent.scope != ""
    {
        errors.push(
            error::E_TIME_ANCHOR_MISSING,
            "rhex.context.at missing for non-first signature",
        );
        return Err(anyhow::anyhow!(
            "rhex.context.at missing for non-first signature"
        ));
    }
    Ok(())
}

/// Validate that if we have one spacial coordinate we have them all.
pub fn validate_context_spacial(rhex: &Rhex, errors: &mut Errors) -> Result<(), anyhow::Error> {
    if rhex.context.x.is_some()
        || rhex.context.y.is_some()
        || rhex.context.z.is_some()
        || rhex.context.refer.is_some()
    {
        // If we have one we should have them all.
        if rhex.context.x.is_none() {
            errors.push(
                error::E_SPACIAL_MISSING,
                "rhex.context.x missing when spacial data is present",
            );
            return Err(anyhow::anyhow!(
                "rhex.context.x missing when spacial data is present"
            ));
        }
        if rhex.context.y.is_none() {
            errors.push(
                error::E_SPACIAL_MISSING,
                "rhex.context.y missing when spacial data is present",
            );
            return Err(anyhow::anyhow!(
                "rhex.context.y missing when spacial data is present"
            ));
        }
        if rhex.context.z.is_none() {
            errors.push(
                error::E_SPACIAL_MISSING,
                "rhex.context.z missing when spacial data is present",
            );
            return Err(anyhow::anyhow!(
                "rhex.context.z missing when spacial data is present"
            ));
        }
        if rhex.context.refer.is_none() {
            errors.push(
                error::E_SPACIAL_MISSING,
                "rhex.context.refer missing when spacial data is present",
            );
            return Err(anyhow::anyhow!(
                "rhex.context.refer missing when spacial data is present"
            ));
        }
    }
    Ok(())
}

pub fn validate_current_hash(rhex: &Rhex, errors: &mut Errors) -> Result<(), anyhow::Error> {
    let computed_hash = rhex.generate_current_hash()?;
    if rhex.current_hash.is_none() {
        errors.push(error::E_HASH_LENGTH, "rhex.current_hash missing");
        return Err(anyhow::anyhow!("rhex.current_hash missing"));
    }
    let current_hash = rhex.current_hash.unwrap();
    if computed_hash != current_hash {
        errors.push(
            error::E_HASH_MISMATCH,
            "rhex.current_hash does not match computed hash",
        );
        return Err(anyhow::anyhow!(
            "rhex.current_hash does not match computed hash"
        ));
    }
    Ok(())
}
