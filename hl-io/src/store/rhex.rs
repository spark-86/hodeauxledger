use std::{fs, path::PathBuf, str::FromStr};

use hl_core::Rhex;

pub fn store_rhex(path: &str, rhex: &Rhex) -> Result<(), anyhow::Error> {
    let rhex_bin = rhex.into_cbor()?;
    let pb = PathBuf::from_str(path)?;
    fs::write(&pb, rhex_bin)?;
    Ok(())
}

pub fn load_rhex(path: &str) -> Result<Rhex, anyhow::Error> {
    let pb = PathBuf::from_str(path)?;
    let rhex_bin = fs::read(&pb)?;
    let rhex = Rhex::from_cbor(&rhex_bin)?;
    Ok(rhex)
}
