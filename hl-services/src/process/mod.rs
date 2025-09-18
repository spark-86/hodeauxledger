use crate::{build::error::error_rhex, scope::access::can_access};
use ed25519_dalek::{Signature as DalekSig, Verifier, VerifyingKey};
use hl_core::{
    Config, Rhex,
    error::{
        self, E_APPEND_DENIED, E_AUTHOR_KEY_DECODE, E_PREV_HASH_BEHIND_HEAD, E_PREVIOUS_NOT_FOUND,
        E_QUORUM_INSUFFICIENT, E_QUORUM_KEY_DECODE, E_SIG_INVALID, E_SIG_MISSING, E_USHER_MISMATCH,
    },
    policy::rule::Rule,
    rhex::signature::SigType,
    to_base64,
};
use hl_io::{
    db::{self, connect_db, head, rhex::check_nonce},
    sink::RhexSink,
};
use regex::Regex;
use rusqlite::Connection;
use std::sync::Arc;

mod data;
mod key;
mod policy;
mod record;
mod request;
mod scope;
mod usher;

// ─────────────────────────────────────────────────────────────────────────────
// Small error accumulator (mirrors your two vectors, adds nice helpers)

struct Errors {
    stack: Vec<String>,
    messages: Vec<String>,
}
impl Errors {
    fn new() -> Self {
        Self {
            stack: Vec::new(),
            messages: Vec::new(),
        }
    }
    fn push(&mut self, code: &str, msg: impl Into<String>) {
        self.stack.push(code.to_string());
        self.messages.push(msg.into());
    }
    fn is_empty(&self) -> bool {
        self.stack.is_empty()
    }
    fn join_messages(&self) -> String {
        self.messages.join(", ")
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers

fn scope_regex() -> Regex {
    // Compile once per process if you prefer once_cell; local is fine too.
    Regex::new(r"^[a-zA-Z0-9\-.]{1,64}$").unwrap()
}

fn get_current_head(scope: &str, errors: &mut Errors) -> Option<[u8; 32]> {
    match head::get_head(scope) {
        Ok(h) => Some(h),
        Err(_) => {
            errors.push(
                E_PREVIOUS_NOT_FOUND,
                "Could not get current head from cache",
            );
            None
        }
    }
}

fn validate_basic_intent(
    rhex: &Rhex,
    current_head: Option<[u8; 32]>,
    cache_conn: &Connection,
    errors: &mut Errors,
) {
    // previous_hash must exist unless genesis
    if rhex.intent.previous_hash.is_none()
        && (rhex.intent.record_type != "scope:genesis" && rhex.intent.record_type != "request:rhex")
    {
        errors.push(
            error::E_PREVIOUS_HASH_MISSING,
            "rhex.intent.previous_hash missing",
        );
    }

    // scope name
    if !scope_regex().is_match(&rhex.intent.scope) && rhex.intent.scope != "" {
        errors.push(error::E_SCOPE_NAME_INVALID, "rhex.intent.scope invalid");
    }

    // nonce presence/uniqueness
    if rhex.intent.nonce.len() != 16 {
        errors.push(
            error::E_NONCE_MISSING,
            "rhex.intent.nonce missing or invalid",
        );
    } else if let Ok(exists) = check_nonce(cache_conn, &rhex.intent.scope, &rhex.intent.nonce) {
        if exists {
            errors.push(
                error::E_NONCE_REUSED,
                "rhex.intent.nonce has already been used",
            );
        }
    } else {
        // Surface DB-type issues as a generic nonce reuse problem (or add a new code if you want)
        errors.push(
            error::E_NONCE_UNAVALIBLE,
            "Nonce check failed (backend error)",
        );
    }

    // author_pk sanity and consistency with first sig (if present)
    if rhex.intent.author_pk == [0u8; 32] {
        errors.push(
            error::E_AUTHOR_KEY_DECODE,
            "rhex.intent.author_pk missing or invalid",
        );
    } else if let Some(sig0) = rhex.signatures.get(0) {
        if sig0.public_key != rhex.intent.author_pk {
            errors.push(
                error::E_AUTHOR_MISMATCH,
                "rhex.intent.author_pk does not match first signature",
            );
        }
    }

    // usher_pk sanity and consistency with second sig (if present)
    if rhex.intent.usher_pk == [0u8; 32] {
        errors.push(
            error::E_USHER_KEY_DECODE,
            "rhex.intent.usher_pk missing or invalid",
        );
    } else if let Some(sig1) = rhex.signatures.get(1) {
        if sig1.public_key != rhex.intent.usher_pk {
            errors.push(
                error::E_USHER_MISMATCH,
                "rhex.intent.usher_pk does not match second signature",
            );
        }
    }

    // If not genesis, previous must match head we fetched (when we have one)
    if rhex.intent.record_type != "scope:genesis" {
        if let (Some(head), Some(prev)) = (current_head, rhex.intent.previous_hash) {
            if head != prev {
                errors.push(
                    E_PREV_HASH_BEHIND_HEAD,
                    format!(
                        "rhex.intent.previous_hash does not match head. Found: {}, sumbitted: {}",
                        to_base64(&head),
                        to_base64(&prev)
                    ),
                );
            }
        }
    }
}

fn verify_author_signature(rhex: &Rhex, errors: &mut Errors) {
    // Must have an Author sig
    let author_sig = rhex
        .signatures
        .iter()
        .find(|s| s.sig_type == SigType::Author);
    let Some(author_sig) = author_sig else {
        errors.push(E_SIG_MISSING, "No author signature found");
        return;
    };

    // Verify it
    match VerifyingKey::from_bytes(&author_sig.public_key) {
        Err(_) => errors.push(E_AUTHOR_KEY_DECODE, "Could not decode author public key"),
        Ok(vk) => {
            let author_hash = match rhex.author_hash() {
                Ok(h) => h,
                Err(_) => {
                    errors.push(E_SIG_INVALID, "Could not compute author hash");
                    return;
                }
            };
            let sig = DalekSig::from_bytes(&author_sig.sig);
            if vk.verify(&author_hash, &sig).is_err() {
                errors.push(E_SIG_INVALID, "Author signature invalid");
            }
        }
    }
}

use ed25519_dalek::SigningKey;
use subtle::ConstantTimeEq;

fn usher_is_ours(config: &Config, usher_pk: &[u8; 32]) -> bool {
    config.hot_keys.iter().any(|seed: &[u8; 32]| {
        let sk = SigningKey::from_bytes(seed);
        let pk_bytes = sk.verifying_key().to_bytes();
        pk_bytes.ct_eq(usher_pk).into()
    })
}

fn verify_usher_context(rhex: &Rhex, config: &Config, errors: &mut Errors) {
    println!("{:?}", config.hot_keys);
    if usher_is_ours(config, &rhex.intent.usher_pk) {
        return; // good: we're the usher
    }

    // Not ours: ensure exactly 2 sigs are (Author, Usher) correctly placed
    if rhex.signatures.len() == 2 {
        if rhex.signatures[0].public_key != rhex.intent.author_pk {
            errors.push(
                E_USHER_MISMATCH,
                "rhex.intent.author_pk does not match first signature",
            );
        }
        if rhex.signatures[1].public_key != rhex.intent.usher_pk {
            errors.push(
                E_USHER_MISMATCH,
                "rhex.intent.usher_pk does not match second signature",
            );
        }
    } else {
        errors.push(
            E_USHER_MISMATCH,
            "rhex.intent.usher_pk does not match any of our keys",
        );
    }
}

fn load_rules(scope: &str) -> Vec<Rule> {
    hl_io::db::rule::get_rules(scope).unwrap_or_default()
}

fn find_applicable_rule<'a>(rules: &'a [Rule], record_type: &str) -> Option<&'a Rule> {
    // First: exact/type-default match as you designed
    rules
        .iter()
        .find(|r| r.applies_to(record_type))
        // Then: explicit defaults rule if you keep one
        .or_else(|| rules.iter().find(|r| r.applies_to("defaults")))
}

fn verify_quorum_if_present(rhex: &Rhex, rules: &[Rule], record_type: &str, errors: &mut Errors) {
    if rhex.signatures.len() <= 2 {
        return; // quorum not present → nothing to verify
    }

    // k from specific rule or defaults, else 0
    let quorum_k: u16 = find_applicable_rule(rules, record_type)
        .map(|r| r.quorum_k)
        .unwrap_or(0);

    let quorum_sigs: Vec<&hl_core::rhex::signature::Signature> = rhex
        .signatures
        .iter()
        .filter(|s| s.sig_type == SigType::Quorum)
        .collect();

    if quorum_sigs.len() < quorum_k as usize {
        errors.push(
            E_QUORUM_INSUFFICIENT,
            format!(
                "Not enough quorum signatures: have {}, need {}",
                quorum_sigs.len(),
                quorum_k
            ),
        );
        // Continue to check any present quorum sigs anyway
    }

    // Need Author + Usher sigs to compute quorum hash
    let author_sig = rhex
        .signatures
        .iter()
        .find(|s| s.sig_type == SigType::Author);
    let usher_sig = rhex
        .signatures
        .iter()
        .find(|s| s.sig_type == SigType::Usher);

    let Some(author_sig) = author_sig else {
        errors.push(
            E_SIG_MISSING,
            "Missing author signature for quorum validation",
        );
        return;
    };
    let Some(usher_sig) = usher_sig else {
        errors.push(
            E_SIG_MISSING,
            "Missing usher signature for quorum validation",
        );
        return;
    };

    let quorum_hash = match rhex.quorum_hash(author_sig, usher_sig) {
        Ok(h) => h,
        Err(_) => {
            errors.push(E_SIG_INVALID, "Could not compute quorum hash");
            return;
        }
    };

    let mut all_ok = true;
    for sig in quorum_sigs {
        match VerifyingKey::from_bytes(&sig.public_key) {
            Err(_) => {
                errors.push(E_QUORUM_KEY_DECODE, "Could not decode quorum public key");
                all_ok = false;
            }
            Ok(vk) => {
                let dsig = DalekSig::from_bytes(&sig.sig);
                if vk.verify(&quorum_hash, &dsig).is_err() {
                    errors.push(E_SIG_INVALID, "Quorum signature invalid");
                    all_ok = false;
                }
            }
        }
    }

    if !all_ok {
        errors.push(E_SIG_INVALID, "One or more quorum signatures invalid");
    }
}

fn check_policy_access(rhex: &Rhex, errors: &mut Errors) -> anyhow::Result<()> {
    if !can_access(
        &rhex.intent.scope,
        &rhex.intent.author_pk,
        &rhex.intent.record_type,
    )? {
        errors.push(E_APPEND_DENIED, "Append denied based on rules");
    }
    Ok(())
}

fn validate_current_hash(rhex: &Rhex, errors: &mut Errors) -> anyhow::Result<()> {
    let computed = rhex.generate_current_hash()?;
    let provided = rhex.current_hash.unwrap_or([0u8; 32]);
    if provided != computed {
        errors.push(
            error::E_HASH_MISMATCH,
            "rhex.current_hash does not match computed hash",
        );
    }
    Ok(())
}

fn dispatch_record(
    rhex: &Rhex,
    first_time: bool,
    config: &Arc<Config>,
) -> anyhow::Result<Vec<Rhex>> {
    let rt_parts: Vec<&str> = rhex.intent.record_type.split(':').collect();
    match rt_parts.get(0).copied().unwrap_or_default() {
        "policy" => policy::process_policy(rhex, first_time, config),
        "record" => {
            record::process_record(rhex, first_time)?;
            Ok(Vec::new())
        }
        "request" => request::process_request(rhex, first_time, config),
        "scope" => {
            scope::process_scope(rhex, first_time, config)?;
            Ok(Vec::new())
        }
        "key" => key::process_key(rhex, &first_time, config),
        "usher" => usher::process_usher(rhex, first_time, config),
        _ => anyhow::bail!("Invalid record type"),
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Public entrypoint (refactored)

pub fn process_rhex(
    rhex: &Rhex,
    first_time: bool,
    config: &Arc<Config>,
) -> Result<Vec<Rhex>, anyhow::Error> {
    let cache_conn = connect_db(&config.cache_db)?;
    let mut outbound = Vec::new();
    let mut errors = Errors::new();

    // 1) Intent & head
    let current_head = get_current_head(&rhex.intent.scope, &mut errors);
    validate_basic_intent(rhex, current_head, &cache_conn, &mut errors);

    // 1f) Policy access (record_type vs author)
    if first_time {
        check_policy_access(rhex, &mut errors)?;
    }
    // 2) Usher context (are we the usher? else basic placement checks)
    if first_time {
        verify_usher_context(rhex, config, &mut errors);
    }
    // 3) Author signature validity
    verify_author_signature(rhex, &mut errors);

    // Load rules once (borrow-only use)
    let rules: Vec<Rule> = load_rules(&rhex.intent.scope);

    // 4) Quorum (if present)
    verify_quorum_if_present(rhex, &rules, &rhex.intent.record_type, &mut errors);

    // 6) current_hash must match computed
    if rhex.signatures.len() > 2 {
        validate_current_hash(rhex, &mut errors)?;
    }
    // TODO: Check quorum roles. This is important as we don't
    // want just any key signing quorum.

    // TODO:

    // Add to cache
    // FIXME: This needs to check to see if the request is set to record
    // or not.
    if errors.is_empty() && !rhex.intent.record_type.starts_with("request:") {
        let mut cache_source = db::rhex::CacheSink::new(config.cache_db.clone());
        let cache_status = cache_source.send(&rhex);
        if cache_status.is_err() {
            errors.push(
                error::E_CACHE_RHEX,
                format!("Could not write rhex to cache: {:?}", cache_status),
            );
        }
    }
    // 7) Execute or emit error R⬢
    if errors.is_empty() {
        outbound = dispatch_record(rhex, first_time, config)?;
    } else {
        // FIXME: from your note: if usher_pk may be zeros, you could choose a hot_key instead.
        let message = errors.join_messages();
        outbound.push(error_rhex(
            &rhex.intent.scope,
            rhex.intent.usher_pk,
            rhex.intent.author_pk,
            &errors.stack,
            &message,
        )?);
    }

    Ok(outbound)
}
