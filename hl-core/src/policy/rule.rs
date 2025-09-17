#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
pub struct Rule {
    scope: Option<String>,
    pub record_types: Vec<String>,
    pub append_roles: Vec<String>,
    pub quorum_k: u16,
    pub quorum_roles: Vec<String>,
    pub rate_per_mark: u32,
}

impl Rule {
    pub fn new(scope: &str) -> Self {
        Self {
            scope: None,
            record_types: vec![],
            append_roles: vec![],
            quorum_k: 0,
            quorum_roles: vec![],
            rate_per_mark: 0,
        }
    }

    pub fn applies_to(&self, record_type: &str) -> bool {
        self.record_types.iter().any(|rt| {
            if rt == "*" {
                return true; // global wildcard
            }

            // Split both strings on ':'
            let mut rec_parts = record_type.splitn(2, ':');
            let mut rt_parts = rt.splitn(2, ':');

            let rec_main = rec_parts.next().unwrap_or("");
            let rec_sub = rec_parts.next().unwrap_or("");

            let rt_main = rt_parts.next().unwrap_or("");
            let rt_sub = rt_parts.next().unwrap_or("");

            // Main type must match
            if rec_main != rt_main {
                return false;
            }

            // Subtype: allow wildcard
            rt_sub == "*" || rt_sub == rec_sub
        })
    }

    pub fn can_append(&self, roles: &[&str]) -> bool {
        // wildcard: if append_roles contains "*", grant immediately
        if self.append_roles.iter().any(|r| r == "*") {
            return true;
        }

        // otherwise, grant if any presented role is in append_roles
        roles
            .iter()
            .any(|role| self.append_roles.iter().any(|r| r == role))
    }
}
