use anyhow::Ok;
use hl_io::db::usher::get_ushers;

pub fn get_policy(scope: &str) -> Result<(), anyhow::Error> {
    let ushers = get_ushers(&scope)?;
    // FIXME: I'm supposed to grab by weight, but we ain't got time
    //  for that shit right now.
    for usher in ushers {
        println!("usher {}", usher.host)
    }
    Ok(())
}
