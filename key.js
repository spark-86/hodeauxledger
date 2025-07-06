/*****
 * Key management tool
 */
import fs from "fs";
import { loadConfig } from "./services/v2/configService.js";
import { Command } from "commander";
import crypto from "crypto";
import { Key } from "./services/v2/keyService.js";

const program = new Command();
program
    .name("key")
    .description("Key management tool")
    .version("0.0.1")
    .option("-c, --config <config>", "Config file", "config.json")
    .option("-h, --help", "Show help")
    .option("-l, --list", "List keys")
    .option("-g, --generate", "Generate new keys")
    .option("-o, --outfile <file>", "Output file, no suffix", "hodeaux")
    .option("-a, --analyze", "Analyze key")
    .option("-p, --passphrase <passphrase>", "Passphrase for key");

program.parse(process.argv);
const options = program.opts();

let config;
if (fs.existsSync(options.config)) {
    config = loadConfig(options.config);
} else {
    console.error("Config file not found: " + options.config);
    process.exit(1);
}

if (options.help) {
    program.help();
    process.exit(0);
}

if (options.list) {
    const keys = fs.readdirSync(config.secrets);
    for (const key of keys) {
        if (key.endsWith(".key")) {
            console.log(key);
        }
    }
    process.exit(0);
}

if (options.generate) {
    if (!options.passphrase) throw new Error("Passphrase is required");
    const { publicKey, privateKey } = await Key.generatePair(
        options.passphrase
    );

    fs.writeFileSync(
        config.secrets + "/" + options.outfile + ".key",
        privateKey
    );
    fs.writeFileSync(
        config.secrets + "/" + options.outfile + ".pub",
        publicKey
    );
    process.exit(0);
}

if (options.analyze) {
    console.log(
        "Analyzing key " + config.secrets + "/" + options.outfile + ".key"
    );
    const key = fs.readFileSync(
        config.secrets + "/" + options.outfile + ".key",
        "utf8"
    );
    if (!key) {
        console.error("Key not found");
        process.exit(1);
    }
    if (
        !key.startsWith("-----BEGIN PRIVATE KEY-----") &&
        !key.startsWith("-----BEGIN ENCRYPTED PRIVATE KEY-----")
    ) {
        console.error("Key is not a private key");
        process.exit(1);
    }
    const masterKey = {
        key,
        passphrase: options.passphrase ? options.passphrase : "",
    };
    const pubKey = crypto.createPublicKey(masterKey);

    const fingerprint = crypto
        .createHash("sha256")
        .update(
            Key.rawPublicKey(
                pubKey.export({
                    type: "spki",
                    format: "pem",
                })
            )
        )
        .digest("base64");
    console.log("Fingerprint:", fingerprint);
    process.exit(0);
}

console.log(config);
