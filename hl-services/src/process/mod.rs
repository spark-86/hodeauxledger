use hl_core::Rhex;

pub mod policy;
pub mod record;
pub mod request;
pub mod scope;

pub fn process_rhex(rhex: &Rhex, first_time: bool) -> Result<(), anyhow::Error> {
    let record_type = &rhex.intent.record_type;
    let rt_parts = record_type.split(":").collect::<Vec<&str>>();
    match rt_parts[0] {
        "policy" => {
            policy::process_policy(rhex, first_time)?;
        }
        "record" => {
            record::process_record(rhex, first_time)?;
        }
        "request" => {
            request::process_request(rhex, first_time)?;
        }
        "scope" => {
            scope::process_scope(rhex, first_time)?;
        }
        _ => {
            anyhow::bail!("Invalid record type")
        }
    }

    if first_time {}

    Ok(())
}
