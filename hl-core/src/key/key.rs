pub struct Key {
    pub sk: Option<[u8; 32]>,
    pub pk: Option<[u8; 32]>,
}

impl Key {
    pub fn new() -> Self {
        Self { sk: None, pk: None }
    }

    pub fn from_bytes(sk: [u8; 32], pk: [u8; 32]) -> Self {
        Self {
            sk: Some(sk),
            pk: Some(pk),
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
}
