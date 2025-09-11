use crate::policy::rule::Rule;

pub struct Policy {
    pub scope: String,
    pub quorum_ttl: u64,
    pub eff: Option<u64>,
    pub exp: Option<u64>,
    pub note: Option<String>,
    pub rules: Vec<Rule>,
}
