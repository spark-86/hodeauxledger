use anyhow::bail;
use hl_core::Rhex;
use hl_io::screen::print::pretty_print;
use std::fs;

use crate::argv::ViewArgs;

pub fn view(view_args: &ViewArgs) -> Result<(), anyhow::Error> {
    let input = &view_args.input;
    if !fs::exists(input)? {
        bail!("File does not exist: {}", input);
    }
    let rhex_bin = fs::read(input);
    let rhex = rhex_bin.unwrap();
    let rhex = Rhex::from_cbor(&rhex);
    let rhex = rhex.unwrap();
    pretty_print(&rhex)?;
    Ok(())
}
