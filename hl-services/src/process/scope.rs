use hl_core::{
    Authority, Key, Policy, Rhex,
    policy::rule::Rule,
    scope::scope::{Scope, ScopeRoles},
};
use hl_io::db;
use rusqlite::Connection;

pub fn process_scope(
    rhex: &Rhex,
    first_time: bool,
    cache: &Connection,
) -> Result<Vec<Rhex>, anyhow::Error> {
    match rhex.intent.record_type.as_str() {
        "scope:genesis" => scope_genesis(rhex, first_time, cache),
        _ => {
            return Err(anyhow::anyhow!(
                "Unsupported record type for scope processing"
            ));
        }
    }
}

fn scope_genesis(
    rhex: &Rhex,
    first_time: bool,
    cache: &Connection,
) -> Result<Vec<Rhex>, anyhow::Error> {
    // Ok, we have a genesis, which is our starting point of the scope.
    println!("Processing Genesis 🌐💡");
    // Flush the info we have for this scope
    db::scope::flush_scope_full(&cache, &rhex.intent.scope)?;

    // Make the primary rule
    let mut basic_rule = Rule::new(&rhex.intent.scope);
    basic_rule.append_roles = vec!["authority".to_string()];
    basic_rule.record_types = vec!["policy:set".to_string()];
    basic_rule.quorum_k = 1;
    basic_rule.quorum_roles = vec!["authority".to_string()];
    basic_rule.rate_per_mark = 90;

    // Build the Authority
    let authority = Authority {
        scope: rhex.intent.scope.clone(),
        roles: vec!["authority".to_string()],
        key: Key::from_pk_bytes(rhex.intent.author_pk),
        eff: None,
        exp: None,
        note: Some("Default genesis authority".to_string()),
    };

    // Build the scope and store all it's subcomponents
    db::scope::store_scope_full(
        cache,
        &Scope {
            name: rhex.intent.scope.clone(),
            role: ScopeRoles::NoCache,
            last_synced: 0,
            policy: Some(Policy {
                scope: rhex.intent.scope.clone(),
                quorum_ttl: 1_000_000_000,
                eff: None,
                exp: None,
                note: None,
                rules: vec![basic_rule],
            }),
            authorities: vec![authority],
            ushers: vec![],
        },
    )?;
    if first_time {
        // this is one of those records we don't do anything with
        // on creation since technically this gets bundled with
        // scope:request.

        // For where this gets written to the fs, see scope:request
    }
    Ok(Vec::new())
}
