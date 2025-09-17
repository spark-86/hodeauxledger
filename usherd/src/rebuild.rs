use anyhow::{Error, bail};

use crate::argv::RebuildArgs;

pub fn rebuild(rebuild_args: &RebuildArgs) -> Result<(), Error> {
    let config_file = &rebuild_args.config;
    if config_file.is_none() {
        println!("No config file specified");
        bail!("Config file is required");
    }
    let config_file = config_file.clone().unwrap();
    let config = hl_services::config::load_config(&config_file)?;
    hl_io::db::create_db(&config.cache_db)?;
    Ok(())
}
