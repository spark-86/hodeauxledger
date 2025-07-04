#!/usr/bin/env node
import fs from "fs";
import crypto from "crypto";
import canonicalize from "canonicalize";
import axios from "axios";
import { Command } from "commander";
import { keyClean } from "./tools/keyCleaner.js";
import { Record } from "./services/v1/recordService.js";

// Setup CLI
const program = new Command();
program
    .name("submit-record")
    .description("Sign and submit a record to the HodeauxLedger")
    .requiredOption("-s, --scope <scope>", "Ledger scope (e.g. emotor.asset)")
    .requiredOption("-t, --type <type>", "Record type (e.g. asset:add)")
    .requiredOption("-k, --key <keyFile>", "Key file name (no extension)")
    .requiredOption("-j, --json <file>", "JSON file to submit as data")
    .option("-p, --previous <hash>", "Previous hash (required unless genesis)")
    .option("--passkey <envVar>", "Passphrase for the private key")
    .option("--hashonly", "Only hash the record without submitting it")
    .option(
        "--endpoint <url>",
        "API endpoint",
        "http://steward.hodeauxledger.org/v1/append"
    )
    .parse();

const options = program.opts();

async function main() {
    const {
        scope,
        type: recordType,
        key: keyFile,
        json: jsonFile,
        previous: previous_hash = "",
        passkey,
        endpoint,
        hashonly,
    } = options;

    let prevHash;
    try {
        const res = await axios.get(
            `http://steward.hodeauxledger.org/v1/get/${scope}`
        );
        prevHash = res.data;
        console.log("Previous hash:", prevHash.data);
    } catch (err) {
        if (err.response.status === 404) {
            throw new Error(`Scope not found: ${scope}`);
        } else {
            throw err;
        }
    }

    const protocol = "v1";
    const passphrase = passkey || process.env.PASSKEY;

    // 1. Load key
    const keyPath = `/secrets/${keyFile}.key`;
    if (!fs.existsSync(keyPath))
        throw new Error(`Key file not found: ${keyPath}`);
    const privateKeyPem = fs.readFileSync(keyPath, "utf8");

    const privateKey = {
        key: privateKeyPem,
        passphrase,
    };

    const publicKeyObj = crypto.createPublicKey(privateKey);
    const publicKeyPem = keyClean(
        publicKeyObj.export({ type: "spki", format: "pem" })
    );
    const publicKeyHash = crypto
        .createHash("sha256")
        .update(publicKeyPem)
        .digest("base64");

    // 2. Load data
    if (!fs.existsSync(jsonFile))
        throw new Error(`JSON file not found: ${jsonFile}`);
    const data = JSON.parse(fs.readFileSync(jsonFile, "utf8"));

    // 3. Build and sign record
    const record = {
        previous_hash: prevHash.data,
        protocol,
        scope,
        key: publicKeyHash,
        record_type: recordType,
        data,
    };

    const signedRecord = await Record.sign(record, keyFile);

    if (hashonly) {
        // 4. Submit
        console.log("📤 Submitting record to HodeauxLedger API...");
        try {
            const res = await axios.post(endpoint, signedRecord);
            console.log("✅ Record submitted successfully:");
            console.dir(res.data, { depth: null });
            process.exit(0);
        } catch (err) {
            console.error("❌ Error submitting record:");
            if (err.response) {
                console.error("Status:", err.response.status);
                console.error("Data:", err.response.data);
            } else {
                console.error(err.message);
            }
            process.exit(1);
        }
    }
}

main();
