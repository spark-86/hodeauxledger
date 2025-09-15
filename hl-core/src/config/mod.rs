use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct Config {
    pub host: String,
    pub port: u16,
    pub bin_dir: String,
    pub fs_dir: String,
    pub data_dir: String,
    pub cache_db: String,
    pub hot_keys: Vec<[u8; 32]>,
}

impl Config {
    pub fn new() -> Self {
        Self {
            host: "".to_string(),
            port: 0,
            bin_dir: "".to_string(),
            fs_dir: "".to_string(),
            data_dir: "".to_string(),
            cache_db: "".to_string(),
            hot_keys: Vec::new(),
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ConfigFile {
    pub host: Option<String>,
    pub port: Option<u16>,
    pub bin_dir: Option<String>,
    pub fs_dir: Option<String>,
    pub data_dir: Option<String>,
    pub cache_db: Option<String>,
    pub hot_keys: Option<Vec<String>>,
    pub cold_keys: Option<Vec<String>>,
}
