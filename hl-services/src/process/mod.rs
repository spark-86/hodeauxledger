use crate::{build::error::error_rhex, scope::access::can_access};
use hl_core::{
    Config, Rhex,
    error::{self, E_PREVIOUS_NOT_FOUND},
};
use hl_io::db::{head, rhex::check_nonce};
use std::sync::Arc;

pub mod policy;
pub mod record;
pub mod request;
pub mod scope;

pub fn process_rhex(
    rhex: &Rhex,
    first_time: bool,
    config: Arc<Config>,
) -> Result<Vec<Rhex>, anyhow::Error> {
    let mut outbound = Vec::new();
    let mut error_stack = Vec::new();
    let mut error_messages: Vec<String> = Vec::new();

    // 1) Check the intent

    // 1a) Check previous hash
    if rhex.intent.previous_hash.is_none() && rhex.intent.record_type != "scope:genesis" {
        error_stack.push(error::E_PREVIOUS_HASH_MISSING.to_string());
        error_messages.push("rhex.intent.previous_hash missing".to_string());
    }
    let current_head = head::get_head(&rhex.intent.scope);
    if current_head.is_err() {
        error_stack.push(E_PREVIOUS_NOT_FOUND.to_string());
        error_messages.push("Could not get current head from cache".to_string());
    }
    // 1b) Check scope
    // TODO: Make this a function that does more complex checking...
    // Like no double -- or leading/trailing -
    let scope_regex = regex::Regex::new(r"^[a-zA-Z0-9\-.]{1,64}$").unwrap();
    if !scope_regex.is_match(&rhex.intent.scope) {
        error_stack.push(error::E_SCOPE_NAME_INVALID.to_string());
        error_messages.push("rhex.intent.scope invalid".to_string());
    }

    // 1c) Check nonce
    if rhex.intent.nonce.len() != 16 {
        error_stack.push(error::E_NONCE_MISSING.to_string());
        error_messages.push("rhex.intent.nonce missing or invalid".to_string());
    };
    let nonce_exists = check_nonce(&rhex.intent.scope, &rhex.intent.nonce)?;
    if nonce_exists {
        error_stack.push(error::E_NONCE_REUSED.to_string());
        error_messages.push("rhex.intent.nonce has already been used".to_string());
    };

    // 1d) Check author_pk
    if rhex.intent.author_pk == [0u8; 32] {
        error_stack.push(error::E_AUTHOR_KEY_DECODE.to_string());
        error_messages.push("rhex.intent.author_pk missing or invalid".to_string());
    }
    if rhex.signatures.len() > 0 {
        if rhex.signatures[0].public_key != rhex.intent.author_pk {
            error_stack.push(error::E_AUTHOR_MISMATCH.to_string());
            error_messages.push("rhex.intent.author_pk does not match first signature".to_string());
        }
    }
    // I debated on putting the access check here, as author_pk/record_type
    // make up access control, but thought it best to delay it until
    // we get to record type.

    // 1e) Check usher_pk
    if rhex.intent.usher_pk == [0u8; 32] {
        error_stack.push(error::E_USHER_KEY_DECODE.to_string());
        error_messages.push("rhex.intent.usher_pk missing or invalid".to_string());
    }
    if rhex.signatures.len() > 1 {
        if rhex.signatures[1].public_key != rhex.intent.usher_pk {
            error_stack.push(error::E_USHER_MISMATCH.to_string());
            error_messages.push("rhex.intent.usher_pk does not match second signature".to_string());
        }
    }

    // 1f) Check record_type - Here is where we actually check
    // against the policy to see if we can even append this type
    // record.
    let record_type = &rhex.intent.record_type;
    if !can_access(
        &rhex.intent.scope,
        &rhex.intent.author_pk,
        &rhex.intent.record_type,
    )? {
        error_stack.push(error::E_APPEND_DENIED.to_string());
        error_messages.push("Append denied based on rules".to_string());
    }

    // 1g) Check data. This is where schema validation comes in.

    // TODO: Schema validation

    // 2) Check usher_pk against our own keys and see if it is
    // us. If not, see if we are looking for quorum sigs

    // 2a) usher_pk doesn't match. Do we have the appropriate sigs
    // for us to attest to quorum.

    // 3) Do we have an author signature?

    // 3a) We don't

    // 3b) We do, does it verify?

    // 4) Does this have quorum sigs?

    // 4a) Nope, so we need to see if we need usher sig

    // 5) Have we met quorum?

    // 5a) No, append our quorum if need be and return

    // 6) Validate current_hash

    // 7) All checks are clear, "run" the R⬢
    if error_stack.len() == 0 {
        let rt_parts = record_type.split(":").collect::<Vec<&str>>();
        match rt_parts[0] {
            "policy" => {
                outbound = policy::process_policy(rhex, first_time, config)?;
            }
            "record" => {
                record::process_record(rhex, first_time)?;
            }
            "request" => {
                request::process_request(rhex, first_time)?;
            }
            "scope" => {
                scope::process_scope(rhex, first_time)?;
            }
            _ => {
                anyhow::bail!("Invalid record type")
            }
        }

        if first_time {}
    } else {
        // FIXME: Don't assume our key is in usher_pk, as that
        // could be zeros
        let message = error_messages.join(", ");
        outbound.push(error_rhex(
            &rhex.intent.scope,
            rhex.intent.usher_pk,
            rhex.intent.author_pk,
            &error_stack,
            &message,
        )?)
    }
    Ok(outbound)
}
