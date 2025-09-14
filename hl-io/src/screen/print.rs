use hl_core::{Rhex, to_base64};

pub fn pretty_print(rhex: &Rhex) -> Result<(), anyhow::Error> {
    println!("{{");
    println!("    \"magic\": \"{:?}\",", rhex.magic);
    println!("    \"intent\": {{");
    if rhex.intent.previous_hash.is_none() {
        println!("        \"previous_hash\": null,");
    } else {
        println!(
            "        \"previous_hash\": \"{}\",",
            to_base64(&rhex.intent.previous_hash.unwrap())
        );
    }
    println!("        \"scope\": \"{}\",", rhex.intent.scope);
    println!("        \"nonce\": \"{}\",", rhex.intent.nonce);
    println!(
        "        \"author_pk\": \"{}\",",
        to_base64(&rhex.intent.author_pk)
    );
    println!(
        "        \"usher_pk\": \"{}\",",
        to_base64(&rhex.intent.usher_pk)
    );
    println!("        \"record_type\": \"{}\",", rhex.intent.record_type);
    println!("        \"data\":");
    println!("            {},", serde_json::to_string(&rhex.intent.data)?);
    println!("        }},");
    println!("    }},");
    println!("    \"context\": {{");
    println!("        \"at\": {},", rhex.context.at);
    if rhex.context.x.is_some() {
        println!("        \"x\": {},", rhex.context.x.unwrap());
        println!("        \"y\": {},", rhex.context.y.unwrap());
        println!("        \"z\": {},", rhex.context.z.unwrap());
        println!(
            "        \"refer\": \"{}\",",
            rhex.context.refer.clone().unwrap()
        );
    } else {
        println!("        \"x\": null,");
        println!("        \"y\": null,");
        println!("        \"z\": null,");
        println!("        \"refer\": null,");
    }
    println!("    }},");
    println!("    \"signatures\": [");
    for sig in rhex.signatures.iter() {
        println!("        {{");
        println!("           \"sig_type\": \"{}\",", sig.sig_type);
        println!(
            "           \"public_key\": \"{}\",",
            to_base64(&sig.public_key)
        );
        println!("           \"sig\": \"{}\"", to_base64(&sig.sig));
        println!("        }},");
    }
    println!("    ],");
    if rhex.current_hash.is_some() {
        println!(
            "    \"current_hash\": \"{}\",",
            to_base64(&rhex.current_hash.unwrap())
        );
    } else {
        println!("    \"current_hash\": null,");
    }
    println!("}}");
    Ok(())
}
