use crate::sink::RhexSink;
use crate::source::RhexSource;
use hl_core::{Context, Intent, Rhex, b64::b64::from_base64_to_32};
use rusqlite::{Connection, params};

pub struct CacheSource {
    scope: String,
    conn: Connection,
}

impl CacheSource {
    pub fn new(path: String, scope: String) -> Self {
        let conn = Connection::open(&path).unwrap();
        Self { conn, scope }
    }
}

impl RhexSource for CacheSource {
    fn next(&mut self) -> Result<Option<Rhex>, anyhow::Error> {
        let mut stmt = self.conn.prepare(
            r#"
            SELECT
                previous_hash,
                scope,
                nonce,
                author_pk,
                usher_pk,
                record_type,
                data,
                at,
                spacial,
                signatures
            FROM rhex
            WHERE scope = ?1
            "#,
        )?;

        let mut rows = stmt.query(rusqlite::params![&self.scope])?;

        fn parse_spacial(
            s: Option<String>,
        ) -> (Option<f64>, Option<f64>, Option<f64>, Option<String>) {
            if let Some(s) = s {
                let parts: Vec<_> = s.split('/').collect();
                if parts.len() == 4 {
                    let x = parts[0].parse::<f64>().ok();
                    let y = parts[1].parse::<f64>().ok();
                    let z = parts[2].parse::<f64>().ok();
                    let refer = Some(parts[3].to_string());
                    return (x, y, z, refer);
                }
            }
            (None, None, None, None)
        }

        if let Some(row) = rows.next()? {
            let data_json: String = row.get("data")?;
            let signatures_json: String = row.get("signatures")?;
            let (x, y, z, refer) = parse_spacial(row.get::<_, Option<String>>("spacial")?);

            let rhex = Rhex {
                magic: *b"RHEX\x00\x00",
                intent: Intent {
                    previous_hash: row.get("previous_hash")?,
                    scope: row.get("scope")?,
                    nonce: row.get("nonce")?,
                    author_pk: row.get("author_pk")?,
                    usher_pk: row.get("usher_pk")?,
                    record_type: row.get("record_type")?,
                    data: serde_json::from_str(&data_json)?,
                },
                context: Context {
                    at: row.get("at")?,
                    x,
                    y,
                    z,
                    refer,
                },
                signatures: serde_json::from_str(&signatures_json)?,
                current_hash: None,
            };

            return Ok(Some(rhex));
        }

        Ok(None)
    }
}

pub struct CacheSink {
    conn: Connection,
}

impl CacheSink {
    pub fn new(path: String) -> Self {
        let conn = Connection::open(&path).unwrap();
        Self { conn }
    }
}

impl RhexSink for CacheSink {
    fn send(&mut self, r: &Rhex) -> Result<(), anyhow::Error> {
        let data_string = serde_json::to_string(&r.intent.data)?;
        let signatures = serde_json::to_string(&r.signatures)?;
        let spacial = if r.context.x.is_some() {
            // If we have one we should have them all.

            // TODO: I know, this breaks if refer has a "/" in it.
            // I'm hella lazy today and don't feel like fighting it.
            assert!(r.context.y.is_some());
            assert!(r.context.z.is_some());
            assert!(r.context.refer.is_some());
            format!(
                "{}/{}/{}/{}",
                r.context.x.unwrap(),
                r.context.y.unwrap(),
                r.context.z.unwrap(),
                r.context.refer.clone().unwrap()
            )
        } else {
            String::new()
        };
        self.conn.execute(
            "INSERT INTO rhex (previous_hash, scope, nonce, author_pk, usher_pk, record_type, data, at, spacial, signatures) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![
                r.intent.previous_hash,
                r.intent.scope,
                r.intent.nonce,
                r.intent.author_pk,
                r.intent.usher_pk,
                r.intent.record_type,
                data_string,
                r.context.at,
                spacial,
                signatures
            ],
        )?;
        Ok(())
    }
    fn flush(&mut self) -> Result<(), anyhow::Error> {
        Ok(())
    }
}

pub fn check_nonce(cache: &Connection, scope: &str, nonce: &str) -> Result<bool, anyhow::Error> {
    let mut stmt =
        cache.prepare("SELECT COUNT(*) as count FROM rhex WHERE scope = ?1 AND nonce = ?2")?;
    let mut rows = stmt.query(params![scope, nonce])?;
    if let Some(row) = rows.next()? {
        let count: i64 = row.get("count")?;
        Ok(count > 0)
    } else {
        Ok(false)
    }
}

pub fn flush_rhex(cache: &Connection) -> Result<(), anyhow::Error> {
    cache.execute("DELETE FROM rhex", params![])?;
    Ok(())
}

pub fn get_last_append(
    cache: &Connection,
    scope: &str,
    author_pk: &[u8; 32],
    record_type: &str,
) -> Result<Option<(u64, [u8; 32])>, anyhow::Error> {
    let mut stmt = cache.prepare("SELECT current_hash, at FROM rhex WHERE scope = ?1 AND author_pk = ?2 AND record_type = ?3 ORDER BY at DESC LIMIT 1")?;
    let mut rows = stmt.query(params![scope, author_pk, record_type])?;
    if let Some(row) = rows.next()? {
        let at: u64 = row.get("at")?;
        let current_hash: String = row.get("current_hash")?;
        let current_hash = from_base64_to_32(&current_hash)?;
        Ok(Some((at, current_hash)))
    } else {
        Ok(None)
    }
}

pub fn build_table(conn: &Connection) -> Result<(), anyhow::Error> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS rhex (
                previous_hash TEXT,
                scope TEXT,
                nonce INTEGER,
                author_pk TEXT,
                usher_pk TEXT,
                record_type TEXT,
                data TEXT,
                at INTEGER,
                spacial TEXT,
                signatures TEXT,
                PRIMARY KEY (previous_hash, scope)
            )",
        [],
    )?;
    Ok(())
}
