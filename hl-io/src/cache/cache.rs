use std::fs;

use rusqlite::Connection;

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
