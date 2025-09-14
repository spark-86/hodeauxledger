use hl_core::Rhex;

pub fn process_request(rhex: &Rhex, first_time: bool) -> Result<(), anyhow::Error> {
    match rhex.intent.record_type.as_str() {
        "request:rhex" => {}
        _ => {
            return Err(anyhow::anyhow!(
                "Unsupported record type for request processing"
            ));
        }
    }
    Ok(())
}

pub fn request_rhex(rhex: &Rhex, first_time: bool) -> Result<(), anyhow::Error> {
    let scope = rhex.intent.scope.clone();
    let data = rhex.intent.data.clone();
    Ok(())
}
