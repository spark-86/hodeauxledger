use crate::policy::policy::Policy;

pub struct Scope {
    pub name: String,
    pub role: String,
    pub last_synced: u64,
    pub policy: Policy,
}
