use hl_core::{Config, Rhex, keymaster::keymaster::Keymaster};

use std::sync::Arc;

mod data;
mod key;
mod policy;
mod processor;
mod record;
mod request;
mod scope;
mod scope_request;
mod usher;

pub fn process_rhex(
    rhex: &Rhex,
    first_time: bool,
    config: &Arc<Config>,
    keymaster: &Keymaster,
) -> Result<Vec<Rhex>, anyhow::Error> {
    processor::process_rhex(rhex, first_time, config, keymaster)
}
