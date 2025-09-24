use anyhow::bail;
use hl_core::{Rhex, to_base64};
use hl_io::screen::print::pretty_print;
use std::fs;

use crate::argv::ViewArgs;

pub fn view(view_args: &ViewArgs) -> Result<(), anyhow::Error> {
    let input = &view_args.input;
    let base64 = &view_args.base64;
    if !fs::exists(input)? {
        bail!("File does not exist: {}", input);
    }
    let rhex_bin = fs::read(input);
    let rhex = rhex_bin.unwrap();
    let rhex = Rhex::from_cbor(&rhex);
    let rhex = rhex.unwrap();
    if *base64 {
        let rhex_b64 = to_base64(&rhex.into_cbor()?);
        println!("{}", rhex_b64);
        return Ok(());
    }
    pretty_print(&rhex)?;
    Ok(())
}
