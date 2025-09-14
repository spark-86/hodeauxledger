use hl_core::Config;
use std::fs;

pub fn load_config(path: &str) -> Result<Config, anyhow::Error> {
    let config_str = fs::read_to_string(path)?;
    let config = serde_json::from_str(&config_str)?;
    Ok(config)
}
