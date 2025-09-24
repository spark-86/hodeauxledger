use std::{path::PathBuf, str::FromStr, sync::Arc};

use hl_core::{
    Config, Context, Intent, Key, Rhex, Signature, keymaster::keymaster::Keymaster,
    rhex::signature::SigType, time::clock::GTClock, to_base64,
};
use hl_io::{fs::rhex::DirSource, source::RhexSource};
use serde_json::json;

pub fn process_request(
    rhex: &Rhex,
    first_time: bool,
    config: &Arc<Config>,
) -> Result<Vec<Rhex>, anyhow::Error> {
    match rhex.intent.record_type.as_str() {
        "request:rhex" => request_rhex(rhex, first_time, config),
        "request:head" => request_head(rhex, first_time, config),
        _ => Err(anyhow::anyhow!(
            "Unsupported record type for request processing"
        )),
    }
}

pub fn request_rhex(
    rhex: &Rhex,
    first_time: bool,
    config: &Arc<Config>,
) -> Result<Vec<Rhex>, anyhow::Error> {
    let mut rhex_out = Vec::new();
    print!("[📥:R⬢]=~=");
    if first_time {
        println!("Getting scope request...");
        let scope = rhex.intent.scope.clone();
        let mut scope_data = DirSource::new(PathBuf::from_str(&config.fs_dir)?)?;
        while let Some(rhex_item) = scope_data.next()? {
            if rhex_item.intent.scope == scope {
                rhex_out.push(rhex_item);
            }
        }
        println!("Found {} records for scope {}", rhex_out.len(), scope);
    }
    Ok(rhex_out)
}

pub fn request_head(
    rhex: &Rhex,
    first_time: bool,
    config: &Arc<Config>,
) -> Result<Vec<Rhex>, anyhow::Error> {
    if first_time {
        println!("[📥:➡️🧬]=~= Getting head request...");
        let mut keymaster = Keymaster::new();
        keymaster.load_keys(&config.hot_keys)?;
        let parent_scope = rhex.intent.scope.clone();
        let scope_path = format!("{}/{}", config.fs_dir, parent_scope);

        let mut dir_source = DirSource::new(PathBuf::from_str(&scope_path)?)?;
        let mut latest: Option<Rhex> = None;

        while let Some(rhex_item) = dir_source.next()? {
            latest = Some(rhex_item);
        }

        if let Some(genesis) = latest {
            println!(
                "Found head record for scope {}: {}",
                parent_scope,
                to_base64(&genesis.current_hash.clone().unwrap())
            );

            // Intent: flip author/usher roles (response mode)
            let intent = Intent {
                previous_hash: genesis.current_hash.clone(),
                scope: parent_scope.clone(),
                nonce: Intent::gen_nonce(),
                author_pk: rhex.intent.usher_pk, // requester’s usher becomes author
                usher_pk: rhex.intent.author_pk, // we usher on their behalf
                record_type: "head".to_string(),
                data: json!({
                    "head": to_base64(&genesis.current_hash.unwrap()),
                }),
            };

            let clock = GTClock::new(0);
            let context = Context::from_at(clock.now_micromarks_u64());
            let signatures = vec![];
            let current_hash = None;

            let mut return_rhex =
                crate::build::build_rhex(&intent, &context, &signatures, current_hash)?;
            let key_bytes = keymaster.get_matching(&return_rhex.intent.author_pk)?;
            let key = Key::from_bytes(key_bytes);
            let signature = Signature {
                sig_type: SigType::Author,
                public_key: return_rhex.intent.author_pk,
                sig: key.sign(&return_rhex.author_hash()?)?,
            };
            return_rhex.signatures.push(signature);
            Ok(vec![return_rhex])
        } else {
            println!("No records found for scope {}", parent_scope);
            Ok(Vec::new())
        }
    } else {
        Ok(Vec::new())
    }
}
