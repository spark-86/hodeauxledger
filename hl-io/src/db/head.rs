use rusqlite::{Connection, params};

use crate::db::connect_db;

pub fn get_head(scope: &str) -> Result<[u8; 32], anyhow::Error> {
    let cache = connect_db("./ledger/cache/cache.db")?;

    let mut stmt = cache.prepare("SELECT head FROM heads WHERE scope = ?1")?;
    let mut rows = stmt.query(rusqlite::params![scope])?;

    if let Some(row) = rows.next()? {
        let head_hash: String = row.get("head")?;
        let head_hash_bytes = hl_core::b64::b64::from_base64_to_32(&head_hash)?;
        Ok(head_hash_bytes)
    } else {
        anyhow::bail!(hl_core::error::E_PREVIOUS_NOT_FOUND)
    }
}

pub fn set_head(cache: &Connection, scope: &str, head: &[u8; 32]) -> Result<(), anyhow::Error> {
    let head_b64 = hl_core::to_base64(head);
    cache.execute(
        "INSERT OR REPLACE INTO heads (scope, head) VALUES (?1, ?2)",
        rusqlite::params![scope, head_b64],
    )?;
    Ok(())
}

pub fn flush_heads(cache: &Connection) -> Result<(), anyhow::Error> {
    cache.execute("DELETE FROM heads", params![])?;
    Ok(())
}

pub fn build_table(cache: &Connection) -> Result<(), anyhow::Error> {
    cache.execute(
        "CREATE TABLE IF NOT EXISTS heads (
                scope TEXT PRIMARY KEY,
                head TEXT NOT NULL
            )",
        [],
    )?;
    Ok(())
}
