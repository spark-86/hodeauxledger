use crate::{Key, Rhex, Signature, rhex::signature::SigType};
use serde_json::json;

pub struct ErrorStack {
    pub codes: Vec<String>,
    pub messages: Vec<String>,
}

impl ErrorStack {
    pub fn new() -> Self {
        Self {
            codes: Vec::new(),
            messages: Vec::new(),
        }
    }

    pub fn make_error_rhex(
        &self,
        scope: &str,
        key: &Key,
        target_key: &[u8; 32],
    ) -> Result<Rhex, anyhow::Error> {
        let mut rhex = Rhex::new();
        rhex.intent.previous_hash = Some([255u8; 32]);
        rhex.intent.scope = scope.to_string();
        rhex.intent.author_pk = key.pk.unwrap_or([0u8; 32]); // Us
        rhex.intent.usher_pk = *target_key; // Client
        rhex.intent.record_type = "error:response".to_string();
        rhex.intent.data = json!({
            "codes": self.codes,
            "messages": self.messages,
        });
        rhex.add_context(&None)?;
        let author_sig = Signature {
            sig_type: SigType::Author,
            public_key: key.pk.unwrap_or([0u8; 32]),
            sig: key.sign(&rhex.author_hash()?)?,
        };
        rhex.signatures.push(author_sig);
        Ok(rhex)
    }
}
