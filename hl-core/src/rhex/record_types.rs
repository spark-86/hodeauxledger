pub const RECORD_TYPES: [&str; 28] = [
    "scope:genesis",
    "scope:request",
    "scope:create",
    "scope:seal",
    "policy:set",
    "usher:appoint",
    "usher:demote",
    "alias:set",
    "alias:unset",
    "record:data",
    "record:text",
    "record:image",
    "record:audio",
    "record:video",
    "record:document",
    "record:link",
    "record:package",
    "record:piece",
    "record:ban",
    "request:rhex",
    "request:head",
    "request:policy",
    "request:aliases",
    "steward:info",
    "steward:warning",
    "steward:error",
    "key:grant",
    "key:revoke",
];

pub fn is_valid_record_type(record_type: &str) -> bool {
    if record_type.len() == 0 {
        return false;
    }
    for rt in RECORD_TYPES.iter() {
        if record_type == *rt {
            return true;
        }
    }
    false
}
