/*****
 * Key management tool
 */
import fs from "fs";
import { loadConfig } from "./services/v2/configService.js";
import { Command } from "commander";
import crypto from "crypto";
import { Key } from "./services/v2/keyService.js";
import sodium from "libsodium-wrappers-sumo";
import chalk from "chalk";

await sodium.ready;

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
    const privKeys = [];
    const pubKeys = [];
    const hotKeys = [];
    for (const key of keys) {
        if (key.endsWith(".enc.json")) {
            privKeys.push(chalk.yellow(key));
        } else {
            if (key.endsWith(".pub")) {
                pubKeys.push(key);
            } else {
                if (key.endsWith(".hot.json"))
                    hotKeys.push(chalk.red.bold(key));
            }
        }
    }
    console.log(chalk.white.bold("Hot Keys:"));
    console.log(hotKeys.join(", "));
    console.log(chalk.white.bold("Private Keys:"));
    console.log(privKeys.join(", "));
    console.log(chalk.white.bold("Public Keys"));
    console.log(pubKeys.join(", "));
    process.exit(0);
}

if (options.generate) {
    const { publicKey, privateKey } = await Key.generatePair();
    if (options.passphrase) {
        const encrypted = await Key.encryptPrivateKey(
            privateKey,
            options.passphrase
        );
        fs.writeFileSync(
            config.secrets + "/" + options.outfile + ".enc.json",
            JSON.stringify(encrypted)
        );
    } else {
        fs.writeFileSync(
            config.secrets + "/" + options.outfile + ".hot.json",
            JSON.stringify({
                key: privateKey,
            })
        );
    }

    fs.writeFileSync(
        config.secrets + "/" + options.outfile + ".pub",
        publicKey
    );
    console.log("Keys generated - ed25519:" + publicKey);
    process.exit(0);
}

if (options.analyze) {
    if (!options.passphrase) throw new Error("Passphrase is required");
    const encrypted = JSON.parse(
        fs.readFileSync(
            config.secrets + "/" + options.outfile + ".ed25519.json"
        )
    );

    encrypted.passphrase = options.passphrase;
    const privateKey = await Key.decryptPrivateKey(encrypted);
    console.log(
        "Private key is " +
            chalk.yellow.bold(privateKey.length) +
            " bytes long."
    );
    if (privateKey.length === 64) {
        console.log(chalk.green.bold("Good"));
    } else {
        console.log(chalk.red.bold("Bad"));
    }
    process.exit(0);
}

console.log(config);
