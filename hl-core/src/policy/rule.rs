pub struct Rule {
    pub record_types: Vec<String>,
    pub append_roles: Vec<String>,
    pub quorum_k: u16,
    pub quorum_roles: Vec<String>,
    pub rate_per_mark: u32,
}
