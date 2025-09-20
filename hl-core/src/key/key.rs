use anyhow::bail;
use ed25519_dalek::Signer;
use zeroize::Zeroize;

pub struct Key {
    pub sk: Option<[u8; 32]>,
    pub pk: Option<[u8; 32]>,
}

impl Key {
    pub fn new() -> Self {
        Self { sk: None, pk: None }
    }

    pub fn from_pk_bytes(pk: [u8; 32]) -> Self {
        Self {
            sk: None,
            pk: Some(pk),
        }
    }

    pub fn from_bytes(sk: [u8; 32]) -> Self {
        let sk = ed25519_dalek::SigningKey::from_bytes(&sk);
        let pk = sk.verifying_key();
        let sk_bytes = sk.to_bytes();
        let pk_bytes = pk.to_bytes();
        Self {
            sk: Some(sk_bytes),
            pk: Some(pk_bytes),
        }
    }

    pub fn generate(&mut self) -> Result<(), anyhow::Error> {
        let mut buf = [0u8; 32];
        getrandom::fill(&mut buf).expect("failed to fill buffer");
        let sk = ed25519_dalek::SigningKey::from_bytes(&buf);
        let pk = sk.verifying_key();
        let sk_bytes = sk.to_bytes();
        let pk_bytes = pk.to_bytes();
        self.sk = Some(sk_bytes);
        self.pk = Some(pk_bytes);
        Ok(())
    }

    pub fn sign(&self, hash: &[u8; 32]) -> Result<[u8; 64], anyhow::Error> {
        if self.sk.is_none() {
            bail!("Key has no secret key for signing");
        }
        let sk = ed25519_dalek::SigningKey::from_bytes(&self.sk.unwrap());
        let signature: ed25519_dalek::Signature = sk.sign(hash);
        let mut sig_bytes = [0u8; 64];
        sig_bytes.copy_from_slice(&signature.to_bytes());
        Ok(sig_bytes)
    }

    pub fn zero(&self) -> Result<(), anyhow::Error> {
        if self.sk.is_none() {
            bail!("Key has no secret key to zero");
        }
        // Use zeroize crate to zero out the secret key
        let mut sk_bytes = self.sk.unwrap();
        sk_bytes.zeroize();
        Ok(())
    }
}
