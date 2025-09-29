use crate::schema::constraint::Constraint;

mod constraint;

#[derive(Clone)]
pub struct Schema {
    pub name: String,
    pub constraints: Vec<Constraint>,
}

impl Schema {
    pub fn new(name: String, constraints: &Vec<Constraint>) -> anyhow::Result<Self> {
        Ok(Self {
            name,
            constraints: constraints.clone(),
        })
    }
}
