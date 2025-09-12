use rusqlite::Connection;
use std::fs;

pub mod authority;
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
    authority::build_table()?;
    policy::build_table()?;
    rule::build_table()?;
    scope::build_table()?;
    usher::build_table()?;
    rhex::build_table()?;
    Ok(conn)
}
