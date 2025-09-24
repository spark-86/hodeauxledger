use crate::{build::error::error_rhex, process::data::get_data_string};
use ed25519_dalek::{SigningKey, ed25519::signature::SignerMut};
use hl_core::{
    Config, Context, Intent, Key, Rhex, Signature,
    error::{E_FS_DIR_EXISTS, E_GENESIS_SELF_USHER_FORBIDDEN, E_REQUEST_DECODE, stack::ErrorStack},
    from_base64,
    keymaster::keymaster::Keymaster,
    rhex::{context, signature::SigType},
    scope::scope::{Scope, ScopeRoles},
    time::clock::GTClock,
};
use hl_io::{
    db::{self, connect_db, rhex::CacheSink},
    fs::rhex::DirSink,
    sink::RhexSink,
};
use serde_json::json;
use std::path::PathBuf;
use std::str::FromStr;
use std::sync::Arc;

pub fn scope_request(
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
        let mut genesis = parse_genesis(&genesis)?;
        let validated = validate_genesis(&genesis)?;
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
            let parent_scope = format!("{}/{}", config.fs_dir, rhex.intent.scope);
            let scope_path = format!("{}/{}", config.fs_dir, new_scope);
            dbg!(&config.fs_dir, &new_scope, &scope_path);
            match std::fs::create_dir_all(&scope_path) {
                Ok(_) => {
                    println!("ok");
                }
                Err(e) => {
                    error_stack.codes.push(E_FS_DIR_EXISTS.to_string());
                    error_stack
                        .messages
                        .push(format!("Failed to create scope dir: {}", e));
                }
            }
            dbg!(&error_stack.codes);
            if error_stack.codes.len() == 0 {
                println!("Creating scope:create...");
                let intent = Intent {
                    previous_hash: rhex.current_hash,
                    scope: rhex.intent.scope.clone(),
                    nonce: Intent::gen_nonce(),
                    author_pk: rhex.intent.usher_pk,
                    usher_pk: rhex.intent.usher_pk,
                    record_type: "scope:create".to_string(),
                    data: json!({
                        "new_scope": new_scope
                    }),
                };
                let clock = GTClock::new(0);
                let context = context::Context::from_at(clock.now_micromarks_u64());
                let signatures = vec![];
                let current_hash = None;
                let mut create_rhex =
                    crate::build::build_rhex(&intent, &context, &signatures, current_hash)?;
                let key_bytes = keymaster.get_matching(&rhex.intent.usher_pk)?;
                if key_bytes == [0u8; 32] {
                    error_stack.codes.push(E_REQUEST_DECODE.to_string());
                    error_stack
                        .messages
                        .push("Requester's keymaster does not have the usher key".to_string());
                }
                let mut signing_key = SigningKey::from_bytes(&key_bytes);
                create_rhex.signatures.push(Signature {
                    sig_type: SigType::Author,
                    public_key: rhex.intent.usher_pk,
                    sig: signing_key.sign(&create_rhex.author_hash()?).into(),
                });
                create_rhex.signatures.push(Signature {
                    sig_type: SigType::Usher,
                    public_key: rhex.intent.usher_pk,
                    sig: signing_key
                        .sign(&create_rhex.usher_hash(&create_rhex.signatures[0])?)
                        .into(),
                });
                // FIXME: this should do a quorum lookup to see how many
                // quorum sigs we need to get and then get them, but we
                // are just gonna assume K=1 here too
                create_rhex.signatures.push(Signature {
                    sig_type: SigType::Quorum,
                    public_key: rhex.intent.usher_pk,
                    sig: signing_key
                        .sign(
                            &create_rhex.quorum_hash(
                                &create_rhex.signatures[0],
                                &create_rhex.signatures[1],
                            )?,
                        )
                        .into(),
                });
                println!("Writing to disk... {}", parent_scope);
                let mut dir_sink = DirSink::new(PathBuf::from_str(&parent_scope)?);
                dir_sink.send(&rhex)?;
                dir_sink.send(&create_rhex)?;
                let mut cache_sink = CacheSink::new(config.cache_db.clone());
                cache_sink.send(&rhex)?;
                cache_sink.send(&create_rhex)?;
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
                if sk != [0u8; 32] {
                    let mut signing_key = SigningKey::from_bytes(&sk);

                    genesis.add_context(&None)?;
                    let usher_hash = genesis.usher_hash(&genesis.signatures[0])?;
                    let usher_sig = Signature {
                        sig_type: SigType::Usher,
                        public_key: genesis.intent.usher_pk,
                        sig: signing_key.sign(&usher_hash).into(),
                    };
                    genesis.signatures.push(usher_sig);
                } else {
                    error_stack.codes.push(E_REQUEST_DECODE.to_string());
                    error_stack.messages.push(
                        "Genesis usher key must match a key in the requester's keymaster"
                            .to_string(),
                    );
                }
                if error_stack.codes.len() == 0 {
                    // Since genesis only has k=1 we can sign quorum and attach
                    // as well
                    let quorum_hash =
                        genesis.quorum_hash(&genesis.signatures[0], &genesis.signatures[1])?;
                    let mut quorum_key = SigningKey::from_bytes(&sk);
                    let quorum_sig = Signature {
                        sig_type: SigType::Quorum,
                        public_key: genesis.intent.usher_pk,
                        sig: quorum_key.sign(&quorum_hash).into(),
                    };
                    genesis.signatures.push(quorum_sig);
                    // Append
                    let mut dir_sink = DirSink::new(PathBuf::from_str(&scope_path)?);
                    dir_sink.send(&genesis)?;
                    let mut cache_sink = CacheSink::new(config.cache_db.clone());
                    cache_sink.send(&genesis)?;
                }
            }
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

    let out_rhex = if error_stack.codes.len() > 0 {
        let erhex = error_rhex(
            &rhex.intent.scope,
            rhex.intent.usher_pk,
            rhex.intent.author_pk,
            &error_stack.codes,
            &error_stack.messages.join(", "),
        )?;
        Ok(vec![erhex])
    } else {
        let signing_key = Key::from_bytes(keymaster.get_matching(&rhex.intent.usher_pk)?);
        let intent = Intent {
            previous_hash: rhex.current_hash,
            scope: rhex.intent.scope.clone(),
            nonce: Intent::gen_nonce(),
            author_pk: rhex.intent.usher_pk,
            usher_pk: rhex.intent.author_pk,
            record_type: "scope:request".to_string(),
            data: json!({
                "new_scope": get_data_string(rhex, &vec!["ns".to_string(), "new_scope".to_string()])?,
            }),
        };
        let clock = GTClock::new(0);
        let context = Context::from_at(clock.now_micromarks_u64());
        let mut ok_rhex = Rhex::new();
        ok_rhex.intent = intent;
        ok_rhex.context = context;

        ok_rhex.signatures.push(Signature {
            sig_type: SigType::Author,
            public_key: rhex.intent.usher_pk,
            sig: signing_key.sign(&ok_rhex.author_hash()?)?,
        });

        Ok(vec![ok_rhex])
    };

    out_rhex
}

fn parse_genesis(blob: &str) -> Result<Rhex, anyhow::Error> {
    let genesis_cbor = from_base64(&blob)?;
    let genesis = Rhex::from_cbor(&genesis_cbor)?;
    Ok(genesis)
}

fn validate_genesis(genesis: &Rhex) -> Result<bool, anyhow::Error> {
    // Ensure the genesis is actually a genesis
    if genesis.intent.record_type != "scope:genesis" {
        println!("Not a genesis record");
        return Ok(false);
    }
    // Ensure the genesis scope matches the request scope
    let new_scope = genesis.intent.scope.clone();
    if !genesis.intent.scope.starts_with(&new_scope) {
        println!("Genesis scope does not match requested scope");
        return Ok(false);
    }
    Ok(true)
}
