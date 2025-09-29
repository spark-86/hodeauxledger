use hl_core::policy::rule::Rule;
use rusqlite::{Connection, params};

use crate::db::connect_db;

pub fn store_rule(cache: &Connection, scope: &str, rule: &Rule) -> Result<(), anyhow::Error> {
    let status = cache.execute(
        "INSERT OR REPLACE INTO 
        rules (scope, record_types, append_roles, quorum_k, quorum_roles, rate_per_mark) 
        VALUES (?1, ?2, ?3, ?4, ?5, ?6)        
    ",
        params![
            scope,
            rule.record_types.join(","),
            rule.append_roles.join(","),
            rule.quorum_k,
            rule.quorum_roles.join(","),
            rule.rate_per_mark
        ],
    );
    match status {
        Ok(_) => {}
        Err(e) => {
            eprintln!("Error: {}", e);
            return Err(anyhow::anyhow!("Failed to store rule"));
        }
    }
    Ok(())
}

pub fn get_rules(cache: &Connection, scope: &str) -> Result<Vec<Rule>, anyhow::Error> {
    let mut stmt = cache.prepare(
        "SELECT record_types, append_roles, quorum_k, quorum_roles, rate_per_mark 
        FROM rules WHERE scope = ?1",
    )?;
    let mut rows = stmt.query(params![scope])?;
    let mut rules = Vec::new();
    while let Some(row) = rows.next()? {
        let record_types_str: String = row.get("record_types")?;
        let append_roles_str: String = row.get("append_roles")?;
        let quorum_roles_str: String = row.get("quorum_roles")?;

        let record_types = record_types_str
            .split(',')
            .filter(|s| !s.is_empty())
            .map(|s| s.to_string())
            .collect();
        let append_roles = append_roles_str
            .split(',')
            .filter(|s| !s.is_empty())
            .map(|s| s.to_string())
            .collect();
        let quorum_roles = quorum_roles_str
            .split(',')
            .filter(|s| !s.is_empty())
            .map(|s| s.to_string())
            .collect();
        let mut rule = Rule::new(scope);
        rule.record_types = record_types;
        rule.append_roles = append_roles;
        rule.quorum_k = row.get("quorum_k")?;
        rule.quorum_roles = quorum_roles;
        rule.rate_per_mark = row.get("rate_per_mark")?;
        rules.push(rule);
    }
    Ok(rules)
}

pub fn clear_scope_rules(scope: &str) -> Result<(), anyhow::Error> {
    let cache = connect_db("./ledger/cache/cache.db")?;
    cache.execute("DELETE FROM rules WHERE scope = ?1", params![scope])?;
    Ok(())
}

pub fn flush_rules(cache: &Connection) -> Result<(), anyhow::Error> {
    cache.execute("DELETE FROM rules", params![])?;
    Ok(())
}

pub fn build_table(cache: &Connection) -> Result<(), anyhow::Error> {
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
