use crate::Key;

pub struct Keymaster {
    pub hot_keys: Vec<Key>,
    pub primary_key_index: Option<u16>,
}

impl Keymaster {
    pub fn new() -> Self {
        Keymaster {
            hot_keys: vec![],
            primary_key_index: None,
        }
    }

    pub fn load_keys(&mut self, list: &Vec<[u8; 32]>) -> Result<(), anyhow::Error> {
        for key in list {
            let working_key = Key::from_bytes(*key);
            self.hot_keys.push(working_key);
        }
        Ok(())
    }

    pub fn get_matching(&self, pk: &[u8; 32]) -> Result<[u8; 32], anyhow::Error> {
        for key in self.hot_keys.iter() {
            if let Some(key_pk) = key.pk {
                if &key_pk == pk {
                    return Ok(key.sk.unwrap_or([0u8; 32]));
                }
            }
        }
        Err(anyhow::anyhow!("No matching key found"))
    }

    pub fn set_primary_key(&mut self, target_key: &[u8; 32]) -> Result<(), anyhow::Error> {
        for (i, key) in self.hot_keys.iter().enumerate() {
            if let Some(key_pk) = key.pk {
                if &key_pk == target_key {
                    self.primary_key_index = Some(i as u16);
                    return Ok(());
                }
            }
        }
        Err(anyhow::anyhow!("No matching key found to set as primary"))
    }

    pub fn get_primary_key(&self) -> Result<Key, anyhow::Error> {
        if let Some(index) = self.primary_key_index {
            if let Some(key) = self.hot_keys.get(index as usize) {
                return Ok(key.clone());
            }
        }
        Err(anyhow::anyhow!("No primary key set"))
    }

    pub fn zero(&self, pk: &[u8; 32]) -> Result<(), anyhow::Error> {
        for key in self.hot_keys.iter() {
            if let Some(key_pk) = key.pk {
                if &key_pk == pk {
                    key.zero()?;
                    return Ok(());
                }
            }
        }
        Err(anyhow::anyhow!("No matching key found to zero"))
    }

    pub fn zero_all(&mut self) -> Result<(), anyhow::Error> {
        for key in self.hot_keys.iter() {
            key.zero()?;
        }
        self.hot_keys = Vec::new();
        Ok(())
    }
}
