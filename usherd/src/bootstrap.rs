use std::{path::PathBuf, str::FromStr, sync::Arc, vec};

use hl_core::{
    Authority, Key, authority, keymaster::keymaster::Keymaster, policy::rule::Rule, to_base64,
};
use hl_io::{
    db::{self, connect_db, flush_all, head::set_head},
    fs::{self, authority::load_key_hot},
    screen::print::pretty_print,
    source::RhexSource,
};

use hl_services::{config::load_config, process};

use crate::argv::ListenArgs;

pub fn bootstrap(listen_args: &ListenArgs) -> Result<(), anyhow::Error> {
    println!("Bootstrapping usher...");

    let config_file = &listen_args.config;
    let config = config_file
        .clone()
        .unwrap_or("usherd_config.json".to_string());
    let config = load_config(&config)?;

    // Flushing cache.db
    flush_all(&config.cache_db)?;

    // Create keymaster and load keys
    println!("Setting up keymaster...");
    let mut keymaster = Keymaster::new();
    for key in config.hot_keys.iter() {
        keymaster.hot_keys.push(Key::from_bytes(*key));
    }

    println!("Loading root scope...");
    let root_dir = PathBuf::from_str(&config.fs_dir)?;
    println!("Loading scope: {:?}", root_dir.to_str());
    let mut dir_source = fs::rhex::DirSource::new(root_dir)?;
    let config = Arc::new(config);
    let cache = connect_db(&config.cache_db)?;
    // add scope "" current_hash none head
    let status = set_head(&cache, "", &[0u8; 32]);
    match status {
        Ok(_) => {}
        Err(e) => {
            println!("Error setting head: {:?}", e);
            return Err(e);
        }
    }
    // add rule
    let mut rule = Rule::new("");
    rule.record_types = vec!["scope:genesis".to_string()];
    rule.append_roles = vec!["authority".to_string()];
    rule.quorum_k = 1;
    rule.quorum_roles = vec!["authority".to_string()];
    rule.rate_per_mark = 1;
    db::rule::store_rule(&cache, "", &rule)?;
    let mut head = [0u8; 32];
    loop {
        let rhex_opt = dir_source.next();
        let rhex_opt = match rhex_opt {
            Ok(r) => r,
            Err(e) => {
                println!("Error loading rhex: {:?}", e);
                break;
            }
        };
        //println!("{:?}", rhex_opt);
        if rhex_opt.is_none() {
            break;
        }
        let rhex = rhex_opt.unwrap();
        if rhex.current_hash.is_some() {
            //println!("Loaded rhex: {}", to_base64(&rhex.current_hash.unwrap()));
            head = rhex.current_hash.unwrap();
        } else {
            println!("Loaded rhex with no current_hash");
        }

        let output = process::process_rhex(&rhex, false, &config, &keymaster)?;
        for rhex in output {
            pretty_print(&rhex);
        }
        set_head(&cache, "", &head)?;
    }
    Ok(())
}
