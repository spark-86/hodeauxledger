use rusqlite::Connection;
use std::fs;

pub mod authority;
pub mod head;
pub mod policy;
pub mod rhex;
pub mod rule;
pub mod scope;
pub mod usher;

pub fn delete_db(path: &str) -> Result<(), anyhow::Error> {
    let delete_status = fs::remove_file(path);
    if delete_status.is_err() {
        println!("No existing database to delete");
        return Ok(());
    }
    Ok(())
}

pub fn connect_db(path: &str) -> Result<Connection, anyhow::Error> {
    let conn = Connection::open(path)?;
    Ok(conn)
}

pub fn create_db(path: &str) -> Result<Connection, anyhow::Error> {
    delete_db(path)?;
    let conn = Connection::open(path)?;
    authority::build_table(&conn)?;
    policy::build_table(&conn)?;
    rule::build_table(&conn)?;
    scope::build_table(&conn)?;
    usher::build_table(&conn)?;
    rhex::build_table(&conn)?;
    head::build_table(&conn)?;
    Ok(conn)
}

pub fn flush_all(path: &str) -> Result<(), anyhow::Error> {
    let cache = Connection::open(path)?;
    authority::flush_authorities(&cache)?;
    head::flush_heads(&cache)?;
    policy::flush_policies(&cache)?;
    rhex::flush_rhex(&cache)?;
    rule::flush_rules(&cache)?;
    scope::flush_scopes(&cache)?;
    usher::flush_ushers(&cache)?;
    Ok(())
}
