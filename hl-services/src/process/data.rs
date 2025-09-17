use hl_core::Rhex;

pub fn get_data_string(rhex: &Rhex, possible_keys: &Vec<String>) -> Result<String, anyhow::Error> {
    let data_map =
        rhex.intent.data.as_object().ok_or_else(|| {
            anyhow::anyhow!("Data is not a JSON object, cannot extract string value")
        })?;

    for key in possible_keys {
        if let Some(value) = data_map.get(key) {
            if let Some(s) = value.as_str() {
                return Ok(s.to_string());
            }
        }
    }

    Err(anyhow::anyhow!(
        "None of the specified keys found in data or values are not strings"
    ))
}

pub fn get_data_u64(rhex: &Rhex, possible_keys: &Vec<String>) -> Result<u64, anyhow::Error> {
    let data_map =
        rhex.intent.data.as_object().ok_or_else(|| {
            anyhow::anyhow!("Data is not a JSON object, cannot extract u64 value")
        })?;

    for key in possible_keys {
        if let Some(value) = data_map.get(key) {
            if let Some(n) = value.as_u64() {
                return Ok(n);
            }
        }
    }

    Err(anyhow::anyhow!(
        "None of the specified keys found in data or values are not u64"
    ))
}

pub fn get_data_array(
    rhex: &Rhex,
    possible_keys: &Vec<String>,
) -> Result<Vec<String>, anyhow::Error> {
    let data_map =
        rhex.intent.data.as_object().ok_or_else(|| {
            anyhow::anyhow!("Data is not a JSON object, cannot extract array value")
        })?;

    for key in possible_keys {
        if let Some(value) = data_map.get(key) {
            if let Some(arr) = value.as_array() {
                let string_vec: Vec<String> = arr
                    .iter()
                    .filter_map(|v| v.as_str().map(|s| s.to_string()))
                    .collect();
                return Ok(string_vec);
            }
        }
    }

    Err(anyhow::anyhow!(
        "None of the specified keys found in data or values are not arrays"
    ))
}
