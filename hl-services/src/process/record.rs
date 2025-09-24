use std::{path::PathBuf, str::FromStr, sync::Arc};

use hl_core::{Config, Rhex};
use hl_io::{fs::rhex::DirSink, sink::RhexSink};

pub fn process_record(
    rhex: &Rhex,
    first_time: bool,
    config: &Arc<Config>,
) -> Result<(), anyhow::Error> {
    print!("[📦:📊]=~=");

    if first_time {
        let mut dir_sink = DirSink::new(PathBuf::from_str(&config.fs_dir)?);
        dir_sink.send(rhex)?;
    }
    Ok(())
}
