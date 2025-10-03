use std::sync::Arc;

use hl_core::{Config, Rhex, keymaster::keymaster::Keymaster};

use crate::process;

pub fn dispatch(
    rhex: &Rhex,
    first_time: bool,
    config: &Arc<Config>,
    keymaster: &Keymaster,
) -> Result<Vec<Rhex>, anyhow::Error> {
    let prefix = rhex.intent.record_type.split(":").next().unwrap_or("");
    let out_rhex = match prefix {
        "key" => process::key::process_key(rhex, &first_time, config),
        "policy" => process::policy::process_policy(rhex, first_time, config),
        "scope" => process::scope::process_scope(rhex, first_time, config, keymaster),
        "request" => process::request::process_request(rhex, first_time, config),
        "record" => process::record::process_record(rhex, first_time, config).map(|_| vec![]),
        "usher" => process::usher::process_usher(rhex, first_time, config),
        _ => Err(anyhow::anyhow!(
            "Unsupported record type for dispatch processing"
        )),
    };
    if out_rhex.is_err() {
        eprintln!("Error processing rhex: {:?}", out_rhex.err());
        return Ok(Vec::new());
    }
    Ok(out_rhex.unwrap())
}
