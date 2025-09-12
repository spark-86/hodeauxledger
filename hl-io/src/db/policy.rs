use hl_core::Policy;
use rusqlite::params;

use crate::db::connect_db;

pub fn store_policy(scope: &str, policy: &Policy) -> Result<(), anyhow::Error> {
    let cache = connect_db("./ledger/cache/cache.db")?;
    let status = cache.execute(
        "INSERT OR REPLACE INTO policies (scope, policy) VALUES (?1, ?2)",
        params![scope, serde_json::to_string(policy)?],
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
