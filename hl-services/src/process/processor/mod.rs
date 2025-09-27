use std::sync::Arc;

use hl_core::{Config, Rhex, error, keymaster::keymaster::Keymaster};
use hl_io::db;

use crate::{
    build,
    process::processor::{
        errors::Errors,
        validation::{
            validate_context_at, validate_context_spacial, validate_current_hash,
            validate_intent_author_pk, validate_intent_data, validate_intent_nonce,
            validate_intent_previous_hash, validate_intent_record_type, validate_intent_scope,
            validate_intent_usher_pk, validate_magic,
        },
    },
};

mod dispatch;
mod errors;
mod signatures;
mod validation;

pub fn process_rhex(
    rhex: &Rhex,
    first_time: bool,
    config: &Arc<Config>,
    keymaster: &Keymaster,
) -> Result<Vec<Rhex>, anyhow::Error> {
    let rhex = &rhex.clone();
    let mut outbound: Vec<Rhex> = Vec::new();
    let verbose = config.verbose;
    let mut errors = Errors::new();
    let cache = db::connect_db(&config.cache_db)?;

    // Magic
    validate_magic(rhex, &mut errors)?;

    // Intent
    let current_hash = db::head::get_head(&rhex.intent.scope)?;
    validate_intent_previous_hash(rhex, current_hash, &mut errors)?;
    validate_intent_scope(rhex, &mut errors)?;
    validate_intent_nonce(rhex, &mut errors, &cache)?;
    validate_intent_author_pk(rhex, &mut errors)?;
    validate_intent_usher_pk(rhex, &mut errors, &keymaster, &cache)?;
    validate_intent_record_type(rhex, &mut errors, &cache)?;
    validate_intent_data(rhex, &mut errors)?;

    // Context
    if rhex.signatures.len() > 1 {
        validate_context_at(rhex, &mut errors, &cache)?;
        validate_context_spacial(rhex, &mut errors)?;
    }

    // Signatures
    match rhex.signatures.len() {
        0 => {
            errors.push(error::E_NO_SIGNATURES, "No signatures present");
        }
        1 => {
            // We should have an author sig and be looking for usher sig
            // and first quorum
        }
        2 => {
            // We're looking for quorum. We're not gonna match usher_pk,
            // but we should know who they are
        }
        _ => {
            // 3+, we have full quorum, we are looking to append. Make sure
            // we are usher_pk and are a write authority for this scope.
        }
    }

    // Current Hash
    validate_current_hash(rhex, &mut errors)?;

    // All done checking the R⬢ for stability. Either
    // process or show the list of errors.
    if errors.is_empty() {
        if verbose {
            println!("[✅] Rhex passed validation");
        };
        outbound.append(&mut dispatch::dispatch(
            rhex, first_time, config, &keymaster,
        )?);
    } else {
        if verbose {
            println!("[❌] Rhex failed validation:");
            for (e, m) in errors.stack.iter().zip(errors.messages.iter()) {
                println!(" - {}: {}", e, m);
            }
        }
        let our_key = keymaster.get_primary_key();
        // TODO: error check the key coming back from the keymaster
        let our_key = our_key.unwrap();
        let error_rhex = build::error::error_rhex(
            &rhex.intent.scope,
            our_key.pk.unwrap(),
            rhex.intent.author_pk,
            &errors.stack,
            &errors.join_messages(),
        )?;
        outbound.push(error_rhex);
    }
    Ok(outbound)
}
