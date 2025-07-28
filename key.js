import fs from "fs";
import { Command } from "commander";

import { loadConfig } from "./tools/v4/config.js";
import { Disk } from "./services/v4/diskService.js";
import { Key } from "./services/v4/keyService.js";
import sodium from "libsodium-wrappers-sumo";

await sodium.ready;
const program = new Command();
program
    .name("key")
    .description("Manage keys")
    .version("0.0.1")
    .argument("<keyname>", "Key name (e.g.: master, keymaster, usher)")
    .option("-c, --config <config_file>", "Configuration file", "./config.json")
    .option("-l, --list", "List keys")
    .option("-g, --generate", "Generate a new key")
    .option("-a, --analyze", "Analyze a key")
    .option("-f, --fix", "Fix a key")
    .option("-p, --pubkey", "Get a pub key from a privaet")
    .option("-v, --verbose");

program.parse(process.argv);
const options = program.opts();
const args = program.args;
console.log(args);
const config = loadConfig(options.config, options);
Disk.setPaths(config.secrets, config.ledger);
const keyname = args[0];

if (options.list) {
    const keys = await Disk.listKeys();
    console.log(keys);
} else if (options.generate) {
    const key = await Key.generate();
    await Disk.saveKey(keyname, "hot", key);
    console.log(key);
} else if (options.analyze) {
    const key = await Disk.loadKey(keyname, "enc");
    console.log(key);
    if (key.salt) {
        const decrypted = await Key.decrypt(key, "password");
        console.log(sodium.to_base64(decrypted));
        if (options.pubkey) {
            const derivedPublic =
                sodium.crypto_sign_ed25519_sk_to_pk(decrypted);
            const pubkey = sodium.to_base64(derivedPublic);
            console.log("Derived public key:", pubkey);
        }
    }
} else if (options.fix) {
    const key = await Disk.loadKey(keyname, "hot");
    const onceDecoded = Buffer.from(key.key, "base64").toString("utf8");
    const recovered = Buffer.from(onceDecoded, "base64");
    console.log("Recovered key length: ", recovered.length);
    Disk.saveKey(keyname + "-fixed", "hot", {
        key: sodium.to_base64(recovered),
    });
    const derivedPublic = sodium.crypto_sign_ed25519_sk_to_pk(recovered);
    const pubkey = sodium.to_base64(derivedPublic);

    console.log("Recovered public key:", pubkey);
} else if (!options.analyze && !options.fix && options.pubkey) {
    const key = await Disk.loadKey(keyname, "hot");
    if (!key) {
        console.error("Key not found");
        process.exit(1);
    }
    const derivedPublic = sodium.crypto_sign_ed25519_sk_to_pk(
        Buffer.from(key.key, "base64")
    );
    const pubkey = sodium.to_base64(derivedPublic);
    console.log("Derived public key:", pubkey);
} else {
    console.error("Invalid option");
    process.exit(1);
}
