import { Command } from "commander";
import crypto from "crypto";
import { keyClean } from "./tools/keyCleaner.js";
import fs from "fs";

const program = new Command();

program
    .name("keytool")
    .description("")
    .version("0.0.1")
    .requiredOption("-p, --passphrase <passphrase>", "Passphrase for key")
    .option("-k, --key <keyName>", "Key name")
    .option("-h, --help", "Show help")
    .option("-a, --analyze", "Analyze key")
    .option("-l, --list-keys", "List keys in /secrets")
    .option("-g, --generate-keys <keyName>", "Generate new keys");

program.parse(process.argv);

const options = program.opts();

const generateKeys = async (keyName) => {
    const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
        modulusLength: 4096,
        publicKeyEncoding: {
            type: "spki",
            format: "pem",
        },
        privateKeyEncoding: {
            type: "pkcs8",
            format: "pem",
            cipher: "aes-256-cbc",
            passphrase: options.passphrase,
        },
    });

    console.log(
        "Writing keys to /secrets/" +
            keyName +
            ".key and /secrets/" +
            keyName +
            ".pub"
    );
    fs.writeFileSync("/secrets/" + keyName + ".key", privateKey);
    fs.writeFileSync("/secrets/" + keyName + ".pub", publicKey);
    return { publicKey, privateKey };
};

const listKeys = async () => {
    const keys = fs.readdirSync("/secrets");
    for (const key of keys) {
        if (key.endsWith(".key")) {
            console.log(key);
        }
    }
};

const analyzeKey = async (key) => {
    let keyfingerprint = crypto
        .createHash("sha256")
        .update(keyClean(key))
        .digest("base64");
    console.log("Key fingerprint:", keyfingerprint);
};

let workingPubKey;
let workingSecretKey;

if (options.generateKeys) {
    ({ publicKey: workingPubKey, privateKey: workingSecretKey } =
        await generateKeys(options.keyName));
} else {
    workingPubKey = fs.readFileSync("/secrets/" + options.key + ".pub", "utf8");
    workingSecretKey = fs.readFileSync(
        "/secrets/" + options.key + ".key",
        "utf8"
    );
}

if (options.analyze) {
    if (workingPubKey) analyzeKey(workingPubKey);
}

if (options.listKeys) {
    listKeys();
}

if (options.help) {
    program.help();
}

console.log("Finished keytool.");
