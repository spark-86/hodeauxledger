use rand::{Rng, distr::Alphanumeric};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Intent {
    #[serde(with = "serde_bytes")]
    pub previous_hash: Option<[u8; 32]>,
    pub scope: String,
    pub nonce: String,
    #[serde(with = "serde_bytes")]
    pub author_pk: [u8; 32],
    #[serde(with = "serde_bytes")]
    pub usher_pk: [u8; 32],
    pub record_type: String,
    pub data: serde_json::Value,
}

impl Intent {
    pub fn new() -> Self {
        Self {
            previous_hash: None,
            scope: String::new(),
            nonce: Intent::gen_nonce(),
            author_pk: [0u8; 32],
            usher_pk: [0u8; 32],
            record_type: String::new(),
            data: serde_json::Value::Null,
        }
    }

    pub fn gen_nonce() -> String {
        rand::rng()
            .sample_iter(&Alphanumeric)
            .take(16)
            .map(char::from)
            .collect()
    }
}
