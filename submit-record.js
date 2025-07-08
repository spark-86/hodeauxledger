import { Command } from "commander";
import { Key } from "./services/v2/keyService.js";
import { Record } from "./services/v2/recordService.js";
import grpc from "@grpc/grpc-js";
import { loadConfig } from "./services/v2/configService.js";
import { fileURLToPath } from "url";
import path from "path";
import sodium from "libsodium-wrappers-sumo";
import fs from "fs";

// Setup paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const protoPath = path.join(__dirname, "./proto/usher.proto");

const config = loadConfig("./config.json");
await sodium.ready;

const program = new Command();

program
    .name("submit-record")
    .description("Generates a record to be submitted")
    .version("0.0.1")
    .requiredOption(
        "-t, --type <keytype>",
        "Type of key to use (master, usher, etc)"
    )
    .option("-h, --host <host>", "Usher host (default: localhost)", "localhost")
    .option("--port <portnum>", "Port number (default: 1984)", 1984)
    .option("-p, --passphrase", "Passphrase for the key")
    .requiredOption("-j, --json <file>", "JSON file to sign and send");

program.parse(process.argv);
const options = program.opts();

const packageDef = protoLoader.loadSync(protoPath, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});
const proto = grpc.loadPackageDefinition(packageDef);
const UsherService = proto.usher.UsherSync;
const server = new grpc.Server();

const getTip = async (scope) => {};

const sign = async (data, privateKey) => {
    return await Record.sign(data, privateKey);
};

const validateOptions = (options) => {
    // Validate options

    if (!options.type) {
        console.error("Key type not specified");
        process.exit(1);
    }
    if (!options.json) {
        console.error("JSON file not specified");
        process.exit(1);
    }
    return true;
};

const main = async () => {
    validateOptions(options);

    // Load the key
    let key;

    try {
        key = await Key.privateKeyFromDisk(
            config.secrets,
            options.type,
            options.passphrase ? options.passphrase : ""
        );
    } catch (err) {
        console.error("Error reading key file:", err.message);
        process.exit(1);
    }

    // Load the JSON data
    let data;
    try {
        data = JSON.parse(fs.readFileSync(options.json, "utf8"));
    } catch (err) {
        console.error("Error reading JSON file:", err.message);
        process.exit(1);
    }

    // Shape the data
    const newData = {
        ...data,
        nonce: sodium.to_base64(sodium.randombytes_buf(32)),
        fingerprint: await Key.getPublicFromPrivate(key),
    };

    const signedMessage = await sign(newData, key);
    console.dir(signedMessage, { depth: null });
    process.exit(0);
};

main();
