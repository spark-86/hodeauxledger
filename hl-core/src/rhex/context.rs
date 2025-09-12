use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Context {
    pub at: u64,
    pub x: Option<f64>,
    pub y: Option<f64>,
    pub z: Option<f64>,
    pub refer: Option<String>,
}

impl Context {
    pub fn new() -> Self {
        Self {
            at: 0,
            x: None,
            y: None,
            z: None,
            refer: None,
        }
    }
    pub fn from_at(at: u64) -> Self {
        Self {
            at,
            x: None,
            y: None,
            z: None,
            refer: None,
        }
    }
    pub fn from_xyz(at: u64, x: f64, y: f64, z: f64, refer: String) -> Self {
        Self {
            at,
            x: Some(x),
            y: Some(y),
            z: Some(z),
            refer: Some(refer),
        }
    }
}
