use hl_core::{Config, Rhex};
use std::sync::Arc;

pub fn process_policy(
    rhex: &Rhex,
    first_time: bool,
    config: Arc<Config>,
) -> Result<Vec<Rhex>, anyhow::Error> {
    Ok(Vec::new())
}
