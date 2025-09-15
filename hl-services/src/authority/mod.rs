use std::sync::Arc;

use hl_core::{Config, Key};

pub fn get_hot_keys(config: &Arc<Config>) -> Result<Vec<Key>, anyhow::Error> {
    for key in config.hot_keys.as_slice() {}
    Ok(Vec::new())
}
