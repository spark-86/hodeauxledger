use crate::argv::CraftArgs;
use hl_core::{Context, Intent, Rhex, from_base64};
use std::{path::PathBuf, str::FromStr};

use anyhow::anyhow;
use std::convert::TryInto;

pub fn craft(craft_args: &CraftArgs) -> Result<(), anyhow::Error> {
    println!("{:?}", craft_args);
    let output = &craft_args.io.output;
    let ph_b64_opt = &craft_args.previous_hash;
    let scope = &craft_args.scope;
    let nonce_opt = &craft_args.nonce;
    let author_pk_b64 = &craft_args.author_pk;
    let usher_pk_b64 = &craft_args.usher_pk;
    let record_type = &craft_args.record_type;
    let data = &craft_args.data;

    let pb_output = PathBuf::from_str(output);
    if pb_output.is_err() {
        anyhow::bail!("Invalid output path")
    }
    let pb_output = pb_output.unwrap();

    let ph_opt = if ph_b64_opt.is_some() {
        let ph_b64 = ph_b64_opt.clone().unwrap();
        vec_to_arr32(from_base64(&ph_b64)?).ok()
    } else {
        None
    };

    let author_pk = vec_to_arr32(from_base64(&author_pk_b64)?);
    let usher_pk = vec_to_arr32(from_base64(&usher_pk_b64)?);
    let data_pb = PathBuf::from_str(data);
    if data_pb.is_err() {
        anyhow::bail!("Invalid data path")
    }
    let data_pb = data_pb.unwrap();
    let data = std::fs::read(data_pb)?;
    let data_json = serde_json::from_slice(&data)?;

    let rhex_intent = Intent {
        previous_hash: ph_opt,
        scope: scope.to_string(),
        nonce: nonce_opt.clone().unwrap_or_default(),
        author_pk: author_pk?,
        usher_pk: usher_pk?,
        record_type: record_type.to_string(),
        data: data_json,
    };

    let rhex = Rhex {
        magic: *b"RHEX\x00\x00",
        intent: rhex_intent,
        context: Context {
            at: 0,
            x: None,
            y: None,
            z: None,
            refer: None,
        },
        signatures: Vec::new(),
        current_hash: None,
    };
    let rhex_bin = rhex.into_cbor()?;
    std::fs::write(&pb_output, &rhex_bin)?;
    Ok(())
}

fn vec_to_arr32(v: Vec<u8>) -> anyhow::Result<[u8; 32]> {
    v.try_into()
        .map_err(|v: Vec<u8>| anyhow!("expected 32 bytes, got {}", v.len()))
}
