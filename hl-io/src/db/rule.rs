use hl_core::policy::rule::Rule;
use rusqlite::params;

use crate::db::connect_db;

pub fn store_rule(scope: &str, rule: &Rule) -> Result<(), anyhow::Error> {
    let cache = connect_db("./ledger/cache/cache.db")?;
    let status = cache.execute(
        "INSERT OR REPLACE INTO (
        rules (scope, record_types, append_roles, quorum_k, quorum_roles, rate_per_mark) 
        VALUES (?1, ?2, ?3, ?4, ?5, ?6)        
    ",
        params![],
    );
    Ok(())
}

pub fn build_table() -> Result<(), anyhow::Error> {
    let cache = connect_db("./ledger/cache/cache.db")?;
    cache.execute(
        "CREATE TABLE IF NOT EXISTS rules (
            scope TEXT NOT NULL,
            record_types TEXT NOT NULL,
            append_roles TEXT NOT NULL,
            quorum_k INTEGER,
            quorum_roles TEXT,
            rate_per_mark INTEGER,
            PRIMARY KEY(scope, record_types)
        )",
        params![],
    )?;
    Ok(())
}
