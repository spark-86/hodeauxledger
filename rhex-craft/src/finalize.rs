use crate::argv::FinalizeArgs;
use hl_core::Rhex;
use std::{fs, path::PathBuf, str::FromStr};

pub fn finalize(finalize_args: &FinalizeArgs) -> Result<(), anyhow::Error> {
    let input = &finalize_args.io.input;
    let output = &finalize_args.io.output;

    if input.is_none() {
        anyhow::bail!("Input file required")
    }
    let input = input.clone().unwrap();
    let input_pb = PathBuf::from_str(&input);
    if input_pb.is_err() {
        anyhow::bail!("Invalid input path")
    }
    let input_pb = input_pb.unwrap();
    let output_pb = PathBuf::from_str(output);
    if output_pb.is_err() {
        anyhow::bail!("Invalid output path")
    }
    let output_pb = output_pb.unwrap();
    let rhex_bin = fs::read(&input_pb)?;
    let mut rhex = Rhex::from_cbor(&rhex_bin)?;
    rhex.finalize()?;
    let rhex_bin = rhex.into_cbor()?;
    fs::write(&output_pb, &rhex_bin)?;
    Ok(())
}
