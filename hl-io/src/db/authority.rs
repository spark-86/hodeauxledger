use hl_core::{Authority, Key};
use rusqlite::{Connection, params};

pub fn get_authorities(conn: &Connection, scope: &str) -> Result<Vec<Authority>, anyhow::Error> {
    let mut stmt =
        conn.prepare("SELECT key, roles, eff, exp, note FROM authorities WHERE scope = ?1")?;
    let mut rows = stmt.query([scope])?;
    let mut authorities = Vec::new();
    while let Some(row) = rows.next()? {
        let key: [u8; 32] = row.get("key")?;
        let roles: String = row.get("roles")?;
        let roles = roles.split(',').map(|s| s.trim()).collect::<Vec<&str>>();
        let eff: Option<u64> = row.get("eff")?;
        let exp: Option<u64> = row.get("exp")?;
        let note: Option<String> = row.get("note")?;
        authorities.push(Authority {
            scope: scope.to_string(),
            key: Key::from_pk_bytes(key),
            roles: roles.iter().map(|&s| s.to_string()).collect(),
            eff,
            exp,
            note,
        });
    }
    Ok(authorities)
}

pub fn store_authority(
    conn: &Connection,
    scope: &str,
    authority: &Authority,
) -> Result<(), anyhow::Error> {
    let roles = authority.roles.join(",");
    conn.execute(
        "INSERT OR REPLACE INTO authorities (scope, key, roles, eff, exp, note) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        rusqlite::params![
            scope,
            authority.key.pk.unwrap(),
            roles,
            authority.eff,
            authority.exp,
            authority.note
        ],
    )?;
    Ok(())
}

pub fn flush_authorities(cache: &Connection) -> Result<(), anyhow::Error> {
    cache.execute("DELETE FROM authorities", params![])?;
    Ok(())
}

pub fn build_table(conn: &Connection) -> Result<(), anyhow::Error> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS authorities (
                scope TEXT,
                key TEXT,
                roles TEXT,
                eff INTEGER,
                exp INTEGER,
                note TEXT,
                PRIMARY KEY (key, scope)
            )",
        [],
    )?;
    Ok(())
}
