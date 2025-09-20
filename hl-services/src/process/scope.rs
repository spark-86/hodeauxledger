use std::{path::PathBuf, str::FromStr, sync::Arc};

use hl_core::{
    Authority, Config, Key, Policy, Rhex,
    error::{E_FS_DIR_EXISTS, E_GENESIS_SELF_USHER_FORBIDDEN, E_REQUEST_DECODE, stack::ErrorStack},
    from_base64,
    keymaster::keymaster::Keymaster,
    policy::rule::Rule,
    scope::scope::{Scope, ScopeRoles},
};
use hl_io::{
    db::{self, connect_db},
    fs::rhex::DirSink,
    sink::RhexSink,
};
use rusqlite::Connection;

use crate::process::data::get_data_string;

pub struct ScopeGenesis {
    pub name: String,
    pub unix_ms: Option<u64>,
    pub note: Option<String>,
}

pub fn process_scope(
    rhex: &Rhex,
    first_time: bool,
    config: &Arc<Config>,
    keymaster: &Keymaster,
) -> Result<Vec<Rhex>, anyhow::Error> {
    let cache = connect_db(&config.cache_db)?;
    match rhex.intent.record_type.as_str() {
        "scope:genesis" => scope_genesis(rhex, first_time, &cache),
        "scope:request" => scope_request(rhex, first_time, config, keymaster),
        _ => {
            return Err(anyhow::anyhow!(
                "Unsupported record type for scope processing"
            ));
        }
    }
}

fn scope_genesis(
    rhex: &Rhex,
    first_time: bool,
    cache: &Connection,
) -> Result<Vec<Rhex>, anyhow::Error> {
    // Ok, we have a genesis, which is our starting point of the scope.
    print!("[🌐:💡]=~=");
    // Flush the info we have for this scope
    db::scope::flush_scope_full(&cache, &rhex.intent.scope)?;

    // Make the primary rule
    let mut basic_rule = Rule::new(&rhex.intent.scope);
    basic_rule.append_roles = vec!["authority".to_string()];
    basic_rule.record_types = vec!["policy:set".to_string()];
    basic_rule.quorum_k = 1;
    basic_rule.quorum_roles = vec!["authority".to_string()];
    basic_rule.rate_per_mark = 90;

    // Build the Authority
    let authority = Authority {
        scope: rhex.intent.scope.clone(),
        roles: vec!["authority".to_string()],
        key: Key::from_pk_bytes(rhex.intent.author_pk),
        eff: None,
        exp: None,
        note: Some("Default genesis authority".to_string()),
    };

    // Build the scope and store all it's subcomponents
    db::scope::store_scope_full(
        cache,
        &Scope {
            name: rhex.intent.scope.clone(),
            role: ScopeRoles::NoCache,
            last_synced: 0,
            policy: Some(Policy {
                scope: rhex.intent.scope.clone(),
                quorum_ttl: 1_000_000_000,
                eff: None,
                exp: None,
                note: None,
                rules: vec![basic_rule],
            }),
            authorities: vec![authority],
            ushers: vec![],
        },
    )?;
    if first_time {
        // this is one of those records we don't do anything with
        // on creation since technically this gets bundled with
        // scope:request.

        // For where this gets written to the fs, see scope:request
    }
    Ok(Vec::new())
}

fn scope_request(
    rhex: &Rhex,
    first_time: bool,
    config: &Arc<Config>,
    keymaster: &Keymaster,
) -> Result<Vec<Rhex>, anyhow::Error> {
    print!("[🌐:📥]=~=");
    let mut error_stack = ErrorStack::new();
    let cache = connect_db(&config.cache_db)?;
    if first_time {
        // First we need to make sure we specified the new scope
        let new_scope = get_data_string(rhex, &vec!["ns".to_string(), "new_scope".to_string()])?;

        // check to make sure genesis is attached in base64
        // and formatted correctly
        let genesis = get_data_string(rhex, &vec!["g".to_string(), "genesis".to_string()])?;
        let genesis = parse_genesis(&genesis)?;
        let validated = validate_genesis(&genesis, &rhex.intent.author_pk)?;
        if !validated {
            error_stack.codes.push(E_REQUEST_DECODE.to_string());
            error_stack
                .messages
                .push("Invalid genesis attached".to_string());
        }

        // Check to see if the scope exists
        let exists = db::scope::scope_exists(&cache, &new_scope)?;
        if exists {
            error_stack.codes.push(E_FS_DIR_EXISTS.to_string());
            error_stack
                .messages
                .push("Scope already exists".to_string());
        }

        // Create dir
        if error_stack.codes.len() == 0 {
            let scope_path = format!("{}/{}", config.fs_dir, new_scope);
            match std::fs::create_dir_all(&scope_path) {
                Ok(_) => {}
                Err(e) => {
                    error_stack.codes.push(E_FS_DIR_EXISTS.to_string());
                    error_stack
                        .messages
                        .push(format!("Failed to create scope dir: {}", e));
                }
            }

            // Tack on genesis
            // Sign first - We can do that here without lookups
            // because scope:genesis is always K=1
            if genesis.signatures.len() > 1 {
                error_stack
                    .codes
                    .push(E_GENESIS_SELF_USHER_FORBIDDEN.to_string());
                error_stack.messages.push(
                    "Genesis cannot be signed by multiple parties including the requester"
                        .to_string(),
                );
            } else {
                // set up our signing key
                let sk = keymaster.get_matching(&genesis.intent.usher_pk)?;
            }
            let mut dir_sink = DirSink::new(PathBuf::from_str(&scope_path)?);
            dir_sink.send(&genesis)?;
        }

        let cache = connect_db(&config.cache_db)?;
        let status = db::scope::store_scope_full(
            &cache,
            &Scope {
                name: rhex.intent.scope.clone(),
                role: ScopeRoles::Authority,
                last_synced: 0,
                policy: None,
                authorities: vec![],
                ushers: vec![],
            },
        );
        match status {
            Ok(_) => {}
            Err(e) => {
                eprintln!("Error: {}", e);
                return Err(anyhow::anyhow!("Failed to store scope"));
            }
        }
        let status = db::head::set_head(&cache, &rhex.intent.scope, &[0u8; 32]);
        match status {
            Ok(_) => {}
            Err(e) => {
                eprintln!("Error: {}", e);
                return Err(anyhow::anyhow!("Failed to set head for scope"));
            }
        }
    } else {
        // Really do nothing because all the bootstrap stuff happens in scope:create
    }
    Ok(Vec::new())
}

fn parse_genesis(blob: &str) -> Result<Rhex, anyhow::Error> {
    let genesis_cbor = from_base64(&blob)?;
    let genesis = Rhex::from_cbor(&genesis_cbor)?;
    Ok(genesis)
}

fn validate_genesis(genesis: &Rhex, requester_key: &[u8; 32]) -> Result<bool, anyhow::Error> {
    // Ensure the genesis is actually a genesis
    if genesis.intent.record_type != "scope:genesis" {
        return Ok(false);
    }
    // Ensure the genesis scope matches the request scope
    if !genesis.intent.scope.starts_with(&genesis.intent.scope) {
        return Ok(false);
    }
    // Ensure the genesis is signed by the requester
    if &genesis.intent.author_pk != requester_key {
        return Ok(false);
    }
    Ok(true)
}
