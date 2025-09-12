use hl_core::{Policy, scope::scope::Scope};
use rusqlite::params;

use crate::db::connect_db;

pub fn store_scope(scope: &Scope) -> Result<(), anyhow::Error> {
    let cache = connect_db("./ledger/cache/cache.db")?;
    let status = cache.execute(
        "INSERT OR REPLACE INTO scopes (scope, role, last_synced) VALUES (?1, ?2, ?3)",
        params![scope.name, scope.role.to_string(), scope.last_synced],
    );
    match status {
        Ok(_) => {}
        Err(e) => {
            eprintln!("Error: {}", e);
            return Err(anyhow::anyhow!("Failed to store scope"));
        }
    }
    Ok(())
}

pub fn store_scope_full(scope: &Scope) -> Result<(), anyhow::Error> {
    let cache = connect_db("./ledger/cache/cache.db")?;
    let status = cache.execute(
        "INSERT OR REPLACE INO scopes (scope, role, last_synced) VALUES (?1, ?2, ?3)",
        params![scope.name, scope.role.to_string(), scope.last_synced],
    );
    match status {
        Ok(_) => {
            for auth in scope.authorities.iter() {
                crate::db::authority::store_authority(&scope.name, &auth)?;
            }
            if scope.policy.is_some() {
                crate::db::policy::store_policy_full(&scope.name, &scope.policy.clone().unwrap())?;
            }
            for usher in scope.ushers.iter() {
                crate::db::usher::store_usher(&scope.name, &usher)?;
            }
        }
        Err(e) => {
            eprintln!("Error: {}", e);
        }
    }
    Ok(())
}

pub fn retrieve_scope(scope_name: &str) -> Result<Scope, anyhow::Error> {
    let cache = connect_db("./ledger/cache/cache.db")?;

    let mut stmt = cache.prepare("SELECT scope, role, last_synced FROM scopes WHERE scope = ?1")?;
    let mut rows = stmt.query(params![scope_name])?;

    if let Some(row) = rows.next()? {
        let scope = Scope {
            name: row.get("scope")?,
            role: row.get::<_, String>("role")?.into(),
            last_synced: row.get("last_synced")?,
            policy: None,
            authorities: vec![],
            ushers: vec![],
        };
        Ok(scope)
    } else {
        Err(anyhow::anyhow!("Scope not found"))
    }
}

pub fn flush_scope(scope_name: &str) -> Result<(), anyhow::Error> {
    let cache = connect_db("./ledger/cache/cache.db")?;
    cache.execute("DELETE FROM scopes WHERE scope = ?1", params![scope_name])?;
    Ok(())
}

pub fn flush_scope_full(scope_name: &str) -> Result<(), anyhow::Error> {
    let cache = connect_db("./ledger/cache/cache.db")?;
    cache.execute("DELETE FROM scopes WHERE scope = ?1", params![scope_name])?;
    cache.execute(
        "DELETE FROM authorities WHERE scope = ?1",
        params![scope_name],
    )?;
    cache.execute("DELETE FROM policies WHERE scope = ?1", params![scope_name])?;
    cache.execute("DELETE FROM ushers WHERE scope = ?1", params![scope_name])?;
    Ok(())
}

pub fn build_table() -> Result<(), anyhow::Error> {
    // FIXME: Yet another hardcoded cache location
    let cache = connect_db("./ledger/cache/cache.db")?;
    cache.execute(
        "CREATE TABLE scopes (
                scope TEXT,
                role TEXT,
                last_synced INTEGER,
                PRIMARY KEY (scope)
            )
        ",
        params![],
    )?;
    Ok(())
}
