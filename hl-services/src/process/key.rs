use std::{path::PathBuf, str::FromStr, sync::Arc};

use anyhow::bail;
use hl_core::{Authority, Config, Rhex, b64::b64::from_base64_to_32};
use hl_io::{db::connect_db, fs, sink::RhexSink};

use crate::process::data::{get_data_array, get_data_string, get_data_u64};

pub fn process_key(
    rhex: &Rhex,
    first_time: &bool,
    config: &Arc<Config>,
) -> Result<Vec<Rhex>, anyhow::Error> {
    let out_rhex = match rhex.intent.record_type.as_str() {
        "key:grant" => key_grant(&rhex, first_time, &config),
        _ => Ok(Vec::new()),
    };
    Ok(out_rhex?)
}

pub fn key_grant(
    rhex: &Rhex,
    first_time: &bool,
    config: &Arc<Config>,
) -> Result<Vec<Rhex>, anyhow::Error> {
    print!("[🔑:🟢]=~=");
    let cache = connect_db(&config.cache_db)?;

    let data_key = get_data_string(
        rhex,
        &vec!["pk".to_string(), "public_key".to_string(), "🔓".to_string()],
    );

    if data_key.is_err() {
        bail!("Key Grant missing public key in data");
    }

    let public_key_b64 = data_key.unwrap();
    let public_key_bytes = from_base64_to_32(&public_key_b64)?;

    let mut authority = Authority::new();
    let note = Some(get_data_string(
        rhex,
        &vec!["n".to_string(), "note".to_string(), "🗒️".to_string()],
    )?);
    let roles = get_data_array(
        rhex,
        &vec!["r".to_string(), "roles".to_string(), "🥐".to_string()],
    );

    authority.scope = rhex.intent.scope.clone();
    authority.note = note;
    authority.key = hl_core::Key::from_pk_bytes(public_key_bytes);
    authority.roles = roles.unwrap_or(vec![]);
    authority.eff = Some(get_data_u64(
        rhex,
        &vec![
            "eff".to_string(),
            "effective_micromark".to_string(),
            "🟢🕑".to_string(),
        ],
    )?);
    authority.exp = Some(get_data_u64(
        rhex,
        &vec![
            "exp".to_string(),
            "expiration_micromark".to_string(),
            "🔴🕑".to_string(),
        ],
    )?);

    hl_io::db::authority::store_authority(&cache, &rhex.intent.scope, &authority)?;
    if *first_time {
        println!(
            "Stored new authority key {} for scope {} with roles {:?}",
            public_key_b64, rhex.intent.scope, authority.roles
        );
        let mut dir_sink = fs::rhex::DirSink::new(PathBuf::from_str(&config.fs_dir)?);
        dir_sink.send(rhex)?;
    }

    Ok(Vec::new())
}
