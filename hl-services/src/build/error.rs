use hl_core::{Intent, Rhex};
use serde_json::json;

pub fn error_rhex(
    scope: &str,
    our_pk: [u8; 32],
    target_pk: [u8; 32],
    error_type: &Vec<String>,
    message: &str,
) -> Result<Rhex, anyhow::Error> {
    let mut intent = Intent::new();
    intent.previous_hash = Some([255u8; 32]);
    intent.scope = scope.to_string();
    intent.author_pk = our_pk;
    intent.usher_pk = target_pk;
    intent.record_type = "response:error".to_string();
    if error_type.len() > 0 {
        intent.data = json!({
            "type": error_type,
            "message": message
        });
    } else {
        intent.data = json!({
            "message": message
        });
    }

    let mut rhex = Rhex::new();
    rhex.intent = intent;

    Ok(rhex)
}
