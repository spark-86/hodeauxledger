use std::path::PathBuf;
use std::str::FromStr;

use crate::argv::VerifyArgs;
use ed25519_dalek::{Verifier, VerifyingKey};
use hl_core::rhex::signature::SigType;
use hl_io::fs::rhex::FileSource;
use hl_io::source::RhexSource;

pub fn verify(verify_args: &VerifyArgs) -> Result<(), anyhow::Error> {
    let input = &verify_args.input;
    println!("Verifying: {}", input);

    // Get the rhex input
    let mut rhex = FileSource::new(PathBuf::from_str(&input.clone())?)?;
    let rhex = rhex.next()?;
    if rhex.is_none() {
        anyhow::bail!("Invalid Rhex");
    }
    let rhex = rhex.unwrap();

    if rhex.signatures.len() == 0 {
        anyhow::bail!("No signatures found");
    }

    for sig in rhex.signatures.iter() {
        match sig.sig_type {
            SigType::Author => {
                let vk = VerifyingKey::from_bytes(&sig.public_key).unwrap();
                let hash = rhex.author_hash()?;
                let ed_sig = ed25519_dalek::Signature::from_bytes(&sig.sig);
                vk.verify(&hash, &ed_sig).unwrap();
                println!("Author signature verified");
            }
            SigType::Usher => {
                let vk = VerifyingKey::from_bytes(&sig.public_key).unwrap();
                let author_sig = rhex
                    .signatures
                    .iter()
                    .find(|s| s.sig_type == SigType::Author)
                    .unwrap();
                let hash = rhex.usher_hash(&author_sig)?;
                let ed_sig = ed25519_dalek::Signature::from_bytes(&sig.sig);
                vk.verify(&hash, &ed_sig).unwrap();
                println!("Usher signature verified");
            }
            SigType::Quorum => {
                let vk = VerifyingKey::from_bytes(&sig.public_key).unwrap();
                let author_sig = rhex
                    .signatures
                    .iter()
                    .find(|s| s.sig_type == SigType::Author)
                    .unwrap();
                let usher_sig = rhex
                    .signatures
                    .iter()
                    .find(|s| s.sig_type == SigType::Usher)
                    .unwrap();
                let hash = rhex.quorum_hash(&author_sig, &usher_sig)?;
                let ed_sig = ed25519_dalek::Signature::from_bytes(&sig.sig);
                vk.verify(&hash, &ed_sig).unwrap();
                println!("Quorum signature verified");
            }
        }
    }
    Ok(())
}
