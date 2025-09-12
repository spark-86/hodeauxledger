use std::{path::PathBuf, str::FromStr};

use ed25519_dalek::ed25519::signature::SignerMut;
use hl_core::{Context, Intent, Key, Rhex, Signature, rhex::signature::SigType, to_base64};
use hl_io::{
    fs::{self, rhex::DirSink},
    sink::RhexSink,
};
use serde_json::json;

use crate::argv::CreateArgs;

pub fn create(create_args: &CreateArgs) -> Result<(), anyhow::Error> {
    let output = &create_args.io.output;
    let keyfile = &create_args.keyfile;
    let note = &create_args.note;

    let key = fs::authority::load_key_hot(&PathBuf::from_str(keyfile)?);
    if key.is_err() {
        anyhow::bail!("Invalid keyfile")
    }
    let key = Key::from_bytes(key.unwrap());
    let mut genesis_rhex = Rhex {
        magic: *b"RHEX\x00\x00",
        intent: Intent {
            previous_hash: None,
            scope: "".to_string(),
            nonce: Intent::gen_nonce(),
            author_pk: key.pk.unwrap(),
            usher_pk: key.pk.unwrap(),
            record_type: "scope:genesis".to_string(),
            data: json!({
                "note": note,
                "unix_ms": std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)?
                    .as_millis(),
                "public_key": to_base64(&key.pk.unwrap())
            }),
        },
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

    // Hand sign our genesis with the same key all the way through
    let mut sig = ed25519_dalek::SigningKey::from_bytes(&key.sk.unwrap());
    let author_hash = genesis_rhex
        .author_hash()
        .expect("failed to get author hash");
    let author_sig = Signature {
        sig_type: SigType::Author,
        public_key: key.pk.unwrap(),
        sig: sig.sign(&author_hash).to_bytes(),
    };
    genesis_rhex.signatures.push(author_sig.clone());

    let usher_hash = genesis_rhex
        .usher_hash(&author_sig)
        .expect("failed to get usher hash");
    let usher_sig = Signature {
        sig_type: SigType::Usher,
        public_key: key.pk.unwrap(),
        sig: sig.sign(&usher_hash).to_bytes(),
    };
    genesis_rhex.signatures.push(usher_sig.clone());

    let quorum_hash = genesis_rhex
        .quorum_hash(&author_sig, &usher_sig)
        .expect("failed to get quorum hash");
    let quorum_sig = Signature {
        sig_type: SigType::Quorum,
        public_key: key.pk.unwrap(),
        sig: sig.sign(&quorum_hash).to_bytes(),
    };
    genesis_rhex.signatures.push(quorum_sig);

    genesis_rhex.finalize()?;

    let mut out_dir = DirSink::new(PathBuf::from_str(&output)?);
    let status = out_dir.send(&genesis_rhex);
    match status {
        Ok(_) => {}
        Err(e) => {
            println!("Error: {}", e);
            anyhow::bail!("failed to write genesis.rhex")
        }
    }
    out_dir.flush()?;
    Ok(())
}
