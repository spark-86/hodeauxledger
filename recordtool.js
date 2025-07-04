import fs from "fs";
import crypto from "crypto";
import canonicalize from "canonicalize";
import { keyClean } from "./tools/keyCleaner.js";
import fetch from "node-fetch"; // npm install node-fetch if needed
import { Record } from "./services/v1/recordService.js";

const previous_hash = process.argv[2];
const scope = process.argv[3];
const recordType = process.argv[4];
const keyFile = process.argv[5];
const jsonFile = process.argv[6];
const protocol = "v1";

// 1. Load keys
if (!fs.existsSync(`/secrets/${keyFile}.key`)) throw new Error("Key not found");

const privateKeyPem = fs.readFileSync(`/secrets/${keyFile}.key`, "utf8");
const passphrase = process.env.PASSKEY;

const privateKey = {
    key: privateKeyPem,
    passphrase,
};

const publicKeyObj = crypto.createPublicKey(privateKeyPem);
const publicKeyPem = keyClean(
    publicKeyObj.export({ type: "spki", format: "pem" })
);
const publicKeyHash = crypto
    .createHash("sha256")
    .update(publicKeyPem)
    .digest("base64");

// 2. Load data payload
const data = JSON.parse(fs.readFileSync(jsonFile, "utf8"));

// 3. Build canonical record
const record = {
    previous_hash,
    protocol,
    scope,
    key: publicKeyHash,
    record_type: recordType,
    data,
};

const finalRecord = await Record.sign(record, keyFile);

// 7. Submit to HodeauxLedger API
const submit = async () => {
    console.log("Submitting record to HodeauxLedger API...");
    console.dir(finalRecord, { depth: null });
    return;
    const response = await fetch("http://steward.hodeauxledger.org/v1/append", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(finalRecord),
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Ledger append failed: ${response.status} ${err}`);
    }

    const json = await response.json();
    console.log("✅ Record appended successfully:");
    console.dir(json, { depth: null });
};

submit().catch((err) => {
    console.error("❌ Error submitting record:");
    console.error(err);
    process.exit(1);
});
