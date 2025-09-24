use std::{path::PathBuf, str::FromStr, sync::Arc};

use hl_core::{Config, Rhex, Usher};
use hl_io::{
    db::{self, connect_db},
    fs::{self, rhex::DirSink},
    sink::RhexSink,
};

use crate::process::data::{get_data_string, get_data_u64};

pub fn process_usher(
    rhex: &Rhex,
    first_time: bool,
    config: &Arc<Config>,
) -> Result<Vec<Rhex>, anyhow::Error> {
    match rhex.intent.record_type.as_str() {
        "usher:appoint" => usher_appoint(rhex, first_time, config),
        "usher:demote" => usher_demote(rhex, first_time, config),
        _ => {
            return Err(anyhow::anyhow!(
                "Unsupported record type for usher processing"
            ));
        }
    }
}

pub fn usher_appoint(
    rhex: &Rhex,
    first_time: bool,
    config: &Arc<Config>,
) -> Result<Vec<Rhex>, anyhow::Error> {
    print!("[🛰️:🟢]=~=");
    let cache = connect_db(&config.cache_db);
    let mut usher = Usher::new();
    usher.note = get_data_string(
        rhex,
        &vec!["n".to_string(), "note".to_string(), "🗒️".to_string()],
    )?;
    usher.host = get_data_string(
        rhex,
        &vec!["h".to_string(), "host".to_string(), "🏠".to_string()],
    )?;
    usher.port = get_data_u64(
        rhex,
        &vec!["p".to_string(), "port".to_string(), "🚪".to_string()],
    )?
    .try_into()
    .unwrap();
    let pk_str = get_data_string(
        rhex,
        &vec!["pk".to_string(), "public_key".to_string(), "🔓".to_string()],
    )?;
    usher.public_key = hl_core::b64::b64::from_base64_to_32(&pk_str)?;
    if cache.is_err() {
        return Err(cache.err().unwrap());
    }
    let cache = cache.unwrap();
    db::usher::store_usher(&cache, &rhex.intent.scope, &usher)?;

    if first_time {
        println!(
            "Usher appointed: {} at {}:{}",
            usher.note, usher.host, usher.port
        );
        let mut dir_sink = fs::rhex::DirSink::new(PathBuf::from_str(&config.fs_dir)?);
        dir_sink.send(rhex)?;
    }
    Ok(Vec::new())
}

pub fn usher_demote(
    rhex: &Rhex,
    first_time: bool,
    config: &Arc<Config>,
) -> Result<Vec<Rhex>, anyhow::Error> {
    if first_time {
        let mut dir_sink = DirSink::new(PathBuf::from_str(&config.fs_dir)?);
        dir_sink.send(rhex)?;
    }
    print!("[🛰️:🔴]=~=");
    Ok(Vec::new())
}
