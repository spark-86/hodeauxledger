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
