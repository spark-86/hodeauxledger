use hl_core::Usher;
use rusqlite::params;

use crate::db::connect_db;

pub fn get_ushers(scope: &str) -> Result<Vec<Usher>, anyhow::Error> {
    let cache = connect_db("./ledger/cache/cache.db")?;

    let mut stmt =
        cache.prepare("SELECT name, host, port, proto, priority FROM ushers WHERE scope = ?1")?;
    let mut rows = stmt.query(params![scope])?;

    let mut ushers_out = vec![];
    while let Some(row) = rows.next()? {
        let usher = Usher {
            name: row.get("name")?,
            public_key: row.get("public_key")?,
            host: row.get("host")?,
            port: row.get("port")?,
            proto: row.get("proto")?,
            priority: row.get("priority")?,
        };
        ushers_out.push(usher);
    }
    Ok(ushers_out)
}

pub fn store_usher(scope: &str, usher: &Usher) -> Result<(), anyhow::Error> {
    let cache = connect_db("./ledger/cache/cache.db")?;

    cache.execute(
        "INSERT OR REPLACE INTO ushers (scope, name, public_key, host, port, proto, priority) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
            scope,
            usher.name,
            usher.public_key,
            usher.host,
            usher.port,
            usher.proto,
            usher.priority
        ],
    )?;
    Ok(())
}

pub fn clear_by_scope(scope: &str) -> Result<(), anyhow::Error> {
    let cache = connect_db("./ledger/cache/cache.db")?;

    cache.execute("DELETE FROM ushers WHERE scope = ?1", params![scope])?;
    Ok(())
}

pub fn clear_all() -> Result<(), anyhow::Error> {
    let cache = connect_db("./ledger/cache/cache.db")?;

    cache.execute("DELETE FROM ushers", params![])?;
    Ok(())
}

pub fn build_table() -> Result<(), anyhow::Error> {
    let cache = connect_db("./ledger/cache/cache.db")?;

    cache.execute(
        "CREATE TABLE IF NOT EXISTS ushers (
                scope TEXT,
                name TEXT,
                public_key TEXT,
                host TEXT,
                port INTEGER,
                proto TEXT,
                priority INTEGER,
                PRIMARY KEY (scope, public_key)
            )",
        [],
    )?;
    Ok(())
}
