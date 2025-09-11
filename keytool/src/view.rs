use crate::argv::ViewArgs;
use hl_core::to_base64;
use hl_io::store::authority as authority_store;
use std::{path::PathBuf, str::FromStr};

pub fn view(view_args: &ViewArgs) -> Result<(), anyhow::Error> {
    let input = &view_args.key.keyfile;
    let show_sk = &view_args.show_sk;
    let hot = &view_args.key.hot;
    let password = &view_args.key.password;
    let pb = PathBuf::from_str(input)?;

    let key = if *hot {
        authority_store::load_key_hot(&pb)?
    } else {
        if password.is_none() {
            anyhow::bail!("Password required")
        }
        let password = password.as_ref().unwrap();
        authority_store::load_key(&pb, password)?
    };
    if *show_sk {
        println!("Showing secret key: {}", to_base64(&key));
    }
    let sign_key = ed25519_dalek::SigningKey::from_bytes(&key);
    let key = sign_key.verifying_key().to_bytes();
    println!("Showing public key: {}", to_base64(&key));
    Ok(())
}
