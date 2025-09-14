use hl_core::Policy;
use rusqlite::params;

use crate::db::connect_db;

pub fn store_policy(scope: &str, policy: &Policy) -> Result<(), anyhow::Error> {
    let cache = connect_db("./ledger/cache/cache.db")?;
    let status = cache.execute(
        "INSERT OR REPLACE INTO policies (scope, quorum_ttl, eff, exp, note) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![scope, policy.quorum_ttl, policy.eff, policy.exp, policy.note],
    );
    match status {
        Ok(_) => {}
        Err(e) => {
            eprintln!("Error: {}", e);
            return Err(anyhow::anyhow!("Failed to store policy"));
        }
    };
    Ok(())
}

pub fn store_policy_full(scope: &str, policy: &Policy) -> Result<(), anyhow::Error> {
    store_policy(&scope, &policy)?;
    for rule in policy.rules.iter() {
        crate::db::rule::store_rule(&scope, rule)?;
    }

    Ok(())
}

pub fn retrieve_policy(scope: &str) -> Result<Policy, anyhow::Error> {
    let cache = connect_db("./ledger/cache/cache.db")?;
    let mut stmt =
        cache.prepare("SELECT quorum_ttl, eff, exp, note FROM policies WHERE scope = ?1")?;
    let mut rows = stmt.query(params![scope])?;

    if let Some(row) = rows.next()? {
        let policy = Policy {
            scope: scope.to_string(),
            quorum_ttl: row.get("quorum_ttl")?,
            eff: row.get("eff")?,
            exp: row.get("exp")?,
            note: row.get("note")?,
            rules: vec![], // Rules are retrieved separately
        };
        Ok(policy)
    } else {
        Err(anyhow::anyhow!("Policy not found for scope: {}", scope))
    }
}
pub fn clear_scope_policy(scope: &str) -> Result<(), anyhow::Error> {
    let cache = connect_db("./ledger/cache/cache.db")?;
    cache.execute("DELETE FROM policies WHERE scope = ?1", params![scope])?;
    crate::db::rule::clear_scope_rules(scope)?;

    Ok(())
}

pub fn build_table() -> Result<(), anyhow::Error> {
    let cache = connect_db("./ledger/cache/cache.db")?;
    cache.execute(
        "CREATE TABLE IF NOT EXISTS policies (
                scope TEXT,
                quorum_ttl INTEGER,
                eff INTEGER,
                exp INTEGER,
                note TEXT,
                PRIMARY KEY (scope)
            )",
        params![],
    )?;
    Ok(())
}
