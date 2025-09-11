use hl_core::{Key, to_base64};
use hl_io::store;
use std::{fs, path::PathBuf, str::FromStr};

use crate::argv::GenerateArgs;

/// Generates a keypair and returns them as tuple.
pub fn generate_keypair(args: &GenerateArgs) -> Result<(), anyhow::Error> {
    let keypath = &args.key.keyfile;
    let hot = &args.key.hot;
    let show_sk = &args.show_sk;
    let mut key = Key::new();
    key.generate()?;
    if *hot {
        // We have a hot key, save it to disk as is
        println!("Saving hot key to disk");
        let pb = PathBuf::from_str(keypath)?;
        store::authority::save_key_hot(&pb, &key.sk.unwrap())?;
    } else {
        // We are requesting to save it encrypted
        let password = &args.key.password;
        if password.is_none() {
            anyhow::bail!("Password required")
        }
        let password = password.as_ref().unwrap();
        println!("Saving encrypted key to disk");
        let pb = PathBuf::from_str(keypath)?;
        if pb.exists() {
            fs::remove_file(&pb)?;
        }
        store::authority::save_key(&pb, password, &key.sk.unwrap())?;
    };
    if *show_sk && key.sk.is_some() {
        println!("Showing secret key: {}", to_base64(&key.sk.unwrap()));
    };
    println!("Showing public key: {}", to_base64(&key.pk.unwrap()));
    Ok(())
}
