use std::{path::PathBuf, str::FromStr, sync::Arc};

use hl_core::{Config, Rhex};
use hl_io::{fs::rhex::DirSource, source::RhexSource};

pub fn process_request(
    rhex: &Rhex,
    first_time: bool,
    config: &Arc<Config>,
) -> Result<Vec<Rhex>, anyhow::Error> {
    match rhex.intent.record_type.as_str() {
        "request:rhex" => request_rhex(rhex, first_time, config),
        _ => {
            return Err(anyhow::anyhow!(
                "Unsupported record type for request processing"
            ));
        }
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
        loop {
            let rhex_opt = scope_data.next()?;
            if rhex_opt.is_none() {
                break;
            }
            let rhex_item = rhex_opt.unwrap();
            if rhex_item.intent.scope == scope {
                rhex_out.push(rhex_item);
            }
        }
        println!("Found {} records for scope {}", rhex_out.len(), scope);
    }

    Ok(rhex_out)
}
