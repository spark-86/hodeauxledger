use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct Config {
    pub host: Option<String>,
    pub port: Option<u16>,
    pub bin_dir: Option<String>,
    pub fs_dir: Option<String>,
    pub data_dir: Option<String>,
    pub cache_db: Option<String>,
    pub hot_keys: Option<Vec<[u8; 32]>>,
    pub cold_keys: Option<Vec<[u8; 32]>>,
}

impl Config {
    pub fn new() -> Self {
        Self {
            host: None,
            port: None,
            bin_dir: None,
            fs_dir: None,
            data_dir: None,
            cache_db: None,
            hot_keys: None,
            cold_keys: None,
        }
    }
}
