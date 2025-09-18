use hl_core::{Config, Policy, Rhex, policy::rule};
use hl_io::{
    db::{self, connect_db},
    fs,
    sink::RhexSink,
};
use std::{path::PathBuf, str::FromStr, sync::Arc};

use crate::process::data::{get_data_string, get_data_u64};

pub fn process_policy(
    rhex: &Rhex,
    first_time: bool,
    config: &Arc<Config>,
) -> Result<Vec<Rhex>, anyhow::Error> {
    let out_rhex = match rhex.intent.record_type.as_str() {
        "policy:set" => policy_set(&rhex, first_time, &config),
        _ => Ok(Vec::new()),
    };
    Ok(out_rhex?)
}

pub fn policy_set(
    rhex: &Rhex,
    first_time: bool,
    config: &Arc<Config>,
) -> Result<Vec<Rhex>, anyhow::Error> {
    print!("[📜:🟡]=~=");
    let cache = connect_db(&config.cache_db)?;

    // Flush what we had before this policy in the cache
    db::policy::clear_scope_policy(&cache, &rhex.intent.scope)?;
    db::rule::clear_scope_rules(&rhex.intent.scope)?;

    // TODO: Implement this
    // let schema_status = validate_schema(&rhex.intent.data);
    let note = get_data_string(
        &rhex,
        &vec!["n".to_string(), "note".to_string(), "🗒️".to_string()],
    );
    let quorum_ttl = get_data_u64(
        &rhex,
        &vec![
            "qt".to_string(),
            "quorum_ttl".to_string(),
            "🤝⏳".to_string(),
        ],
    );
    let effective_micromark = get_data_u64(
        &rhex,
        &vec![
            "eff".to_string(),
            "effective_micromark".to_string(),
            "🟢🕑".to_string(),
        ],
    );
    let expires_micromark = get_data_u64(
        &rhex,
        &vec![
            "exp".to_string(),
            "expires_micromark".to_string(),
            "🔴🕑".to_string(),
        ],
    );
    let rules = get_data_rules(
        rhex,
        &vec!["r".to_string(), "rules".to_string(), "⛓️".to_string()],
    );
    let policy = Policy {
        scope: rhex.intent.scope.clone(),
        quorum_ttl: quorum_ttl.unwrap_or(1_000_000_000),
        eff: effective_micromark.ok(),
        exp: expires_micromark.ok(),
        note: note.ok(),
        rules: rules.unwrap_or(Vec::new()),
    };
    db::policy::store_policy_full(&cache, &rhex.intent.scope, &policy)?;

    // Save it to the FS
    if first_time {
        let mut dir_sink = fs::rhex::DirSink::new(PathBuf::from_str(&config.fs_dir)?);
        let status = dir_sink.send(rhex);
        match status {
            Ok(_) => {}
            Err(e) => {
                println!("Error saving to FS: {:?}", e);
            }
        }
    }
    Ok(Vec::new())
}

fn get_data_rules(
    rhex: &Rhex,
    possible_keys: &Vec<String>,
) -> Result<Vec<rule::Rule>, anyhow::Error> {
    let data_map =
        rhex.intent.data.as_object().ok_or_else(|| {
            anyhow::anyhow!("Data is not a JSON object, cannot extract rules array")
        })?;

    for key in possible_keys {
        if let Some(value) = data_map.get(key) {
            if let Some(arr) = value.as_array() {
                let mut rules: Vec<rule::Rule> = Vec::new();
                for item in arr {
                    if let Ok(rule) = serde_json::from_value::<rule::Rule>(item.clone()) {
                        rules.push(rule);
                    } else {
                        return Err(anyhow::anyhow!(
                            "One or more items in rules array could not be parsed as Rule"
                        ));
                    }
                }
                return Ok(rules);
            }
        }
    }

    Err(anyhow::anyhow!(
        "None of the specified keys found in data or values are not arrays"
    ))
}
