use hl_io::db;
use rusqlite::Connection;

pub fn can_access(
    cache: &Connection,
    scope: &str,
    key: &[u8; 32],
    record_type: &str,
) -> Result<bool, anyhow::Error> {
    let rules = db::rule::get_rules(cache, scope)?;

    let authorities = db::authority::get_authorities(cache, scope)?;

    let mut roles = Vec::new();
    for authority in authorities {
        if authority.key.pk.unwrap() == *key {
            roles.extend(authority.roles);
        }
    }

    // Check if any rule allows access
    for rule in rules {
        if rule.applies_to(record_type)
            && rule.can_append(&roles.iter().map(|s| s.as_str()).collect::<Vec<&str>>())
        {
            return Ok(true);
        }
    }

    Ok(false)
}
