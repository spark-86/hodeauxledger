use anyhow::Error;

use crate::argv::RebuildArgs;

pub fn rebuild(rebuild_args: &RebuildArgs) -> Result<(), Error> {
    let _ = rebuild_args;
    Ok(())
}
