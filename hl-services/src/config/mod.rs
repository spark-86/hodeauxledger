use hl_core::{Config, config::ConfigFile};
use hl_io::fs;
use std::{fs as file_fs, path::Path};

pub fn load_config(path: &str) -> Result<Config, anyhow::Error> {
    let config_str = file_fs::read_to_string(path)?;
    let config_file: ConfigFile = serde_json::from_str(&config_str)?;

    println!("{:?}", config_file);

    // Load all the hot keys into memory
    // FIXME: Yes, I'm aware how terrible this is. It's the best
    // I have the energy for right now. Wanna fix it? Be my guest.
    let mut incoming_hot = Vec::new();
    for key in config_file.hot_keys.unwrap_or(vec![]) {
        let hot_key = fs::authority::load_key_hot(&Path::new(&key))?;
        println!("Loaded key file {}", key);
        incoming_hot.push(hot_key);
    }

    let config = Config {
        host: config_file.host.unwrap_or("0.0.0.0".to_string()),
        port: config_file.port.unwrap_or(1984),
        bin_dir: config_file.bin_dir.unwrap_or("./bin".to_string()),
        fs_dir: config_file.fs_dir.unwrap_or("./fs".to_string()),
        data_dir: config_file.data_dir.unwrap_or("./data".to_string()),
        cache_db: config_file.cache_db.unwrap_or("./cache.db".to_string()),
        hot_keys: incoming_hot,
    };
    Ok(config)
}
