use anyhow::Ok;
use hl_core::{
    Authority, Key, Policy, Rhex,
    scope::scope::{Scope, ScopeRoles},
};
use hl_io::db::{self, connect_db};

pub fn process_scope(rhex: &Rhex, first_time: bool) -> Result<(), anyhow::Error> {
    match rhex.intent.record_type.as_str() {
        "scope:genesis" => scope_genesis(rhex, first_time)?,
        _ => {
            return Err(anyhow::anyhow!(
                "Unsupported record type for scope processing"
            ));
        }
    }
    Ok(())
}

fn scope_genesis(rhex: &Rhex, first_time: bool) -> Result<(), anyhow::Error> {
    // Ok, we have a genesis, which is our starting point of the scope.

    // First thing is to create the scope in the database
    db::scope::store_scope(&Scope {
        name: rhex.intent.scope.clone(),
        role: ScopeRoles::NoCache,
        last_synced: 0,
        policy: Policy::new(),
        authorities: vec![],
        ushers: vec![],
    })?;
    db::authority::store_authority(
        &rhex.intent.scope,
        &Authority {
            scope: rhex.intent.scope.clone(),
            roles: vec!["authority".to_string()],
            key: Key::from_pk_bytes(rhex.intent.author_pk),
            eff: None,
            exp: None,
            note: Some("Default genesis authority".to_string()),
        },
    )?;
    db::policy::store_policy(&rhex.intent.scope, &Policy::new())?;
    Ok(())
}
