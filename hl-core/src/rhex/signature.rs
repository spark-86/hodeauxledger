use std::fmt;

use serde::{Deserialize, Serialize};
use serde_with::{Bytes, serde_as};

#[repr(u8)]
#[derive(Serialize, Deserialize, Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub enum SigType {
    Author = 0,
    Usher = 1,
    Quorum = 2,
}

impl TryFrom<u8> for SigType {
    type Error = anyhow::Error;

    fn try_from(value: u8) -> Result<Self, Self::Error> {
        match value {
            0 => Ok(SigType::Author),
            1 => Ok(SigType::Usher),
            2 => Ok(SigType::Quorum),
            _ => Err(anyhow::anyhow!("Invalid SigType value: {}", value)),
        }
    }
}

impl fmt::Display for SigType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            SigType::Author => "Author",
            SigType::Usher => "Usher",
            SigType::Quorum => "Quorum",
        };
        write!(f, "{}", s)
    }
}

#[serde_as]
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Signature {
    pub sig_type: SigType,
    #[serde_as(as = "Bytes")]
    pub public_key: [u8; 32],
    #[serde_as(as = "Bytes")]
    pub sig: [u8; 64],
}
