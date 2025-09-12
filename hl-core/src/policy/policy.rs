use crate::policy::rule::Rule;

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
pub struct Policy {
    pub scope: String,
    pub quorum_ttl: u64,
    pub eff: Option<u64>,
    pub exp: Option<u64>,
    pub note: Option<String>,
    pub rules: Vec<Rule>,
}

impl Policy {
    pub fn new() -> Self {
        Self {
            scope: "".to_string(),
            quorum_ttl: 0,
            eff: None,
            exp: None,
            note: None,
            rules: vec![],
        }
    }
}
