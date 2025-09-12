use base32::Alphabet;

pub fn from_base32_crockford(s: &str) -> anyhow::Result<Vec<u8>> {
    let cleaned: String = s
        .chars()
        .filter(|&c| c != '-' && !c.is_whitespace())
        .map(|c| c.to_ascii_uppercase())
        .collect();

    base32::decode(Alphabet::Crockford, &cleaned)
        .ok_or_else(|| anyhow::anyhow!("invalid Crockford base32"))
}

pub fn to_base32_crockford(bytes: &[u8]) -> String {
    base32::encode(Alphabet::Crockford, bytes)
}
