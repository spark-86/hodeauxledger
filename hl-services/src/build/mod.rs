use hl_core::{Context, Intent, Key, Rhex, Signature, rhex::signature::SigType};

pub mod error;

pub fn build_rhex(
    intent: &Intent,
    context: &Context,
    signatures: &Vec<Signature>,
    current_hash: Option<[u8; 32]>,
) -> Result<Rhex, anyhow::Error> {
    Ok(Rhex {
        magic: *b"RHEX\x00\x00",
        intent: intent.clone(),
        context: context.clone(),
        signatures: signatures.clone(),
        current_hash,
    })
}

pub fn author_sign(rhex: &Rhex, key: &Key) -> Result<Rhex, anyhow::Error> {
    let author_hash = rhex.author_hash()?;
    let author_sig = key.sign(&author_hash)?;
    let mut new_rhex = rhex.clone();
    new_rhex.signatures.push(Signature {
        sig_type: SigType::Author,
        public_key: key.pk.unwrap(),
        sig: author_sig,
    });
    Ok(new_rhex)
}

pub fn usher_sign(rhex: &Rhex, key: &Key) -> Result<Rhex, anyhow::Error> {
    let author_sig = rhex
        .signatures
        .iter()
        .find(|s| s.sig_type == SigType::Author)
        .ok_or_else(|| anyhow::anyhow!("No author signature found"))?;
    let usher_hash = rhex.usher_hash(author_sig)?;
    let usher_sig = key.sign(&usher_hash)?;
    let mut new_rhex = rhex.clone();
    new_rhex.signatures.push(Signature {
        sig_type: SigType::Usher,
        public_key: key.pk.unwrap(),
        sig: usher_sig,
    });
    Ok(new_rhex)
}

pub fn quorum_sign(rhex: &Rhex, key: &Key) -> Result<Rhex, anyhow::Error> {
    let author_sig = rhex
        .signatures
        .iter()
        .find(|s| s.sig_type == SigType::Author)
        .ok_or_else(|| anyhow::anyhow!("No author signature found"))?;
    let usher_sig = rhex
        .signatures
        .iter()
        .find(|s| s.sig_type == SigType::Usher)
        .ok_or_else(|| anyhow::anyhow!("No usher signature found"))?;
    let quorum_hash = rhex.quorum_hash(author_sig, usher_sig)?;
    let quorum_sig = key.sign(&quorum_hash)?;
    let mut new_rhex = rhex.clone();
    new_rhex.signatures.push(Signature {
        sig_type: SigType::Quorum,
        public_key: key.pk.unwrap(),
        sig: quorum_sig,
    });
    Ok(new_rhex)
}

pub fn finalize(rhex: &Rhex) -> Result<Rhex, anyhow::Error> {
    let mut new_rhex = rhex.clone();
    new_rhex.finalize()?;
    Ok(new_rhex)
}
