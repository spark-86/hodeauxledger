#[derive(Clone)]
pub struct Constraint {
    pub index: u16,
    pub name: String,
    pub required: u8, // 0 = false, 1 = true
}

impl Constraint {
    pub fn new(index: &u16, name: &str, required: &u8) -> Constraint {
        Constraint {
            index: *index,
            name: name.to_string(),
            required: *required,
        }
    }
}
