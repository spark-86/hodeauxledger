import { Keyring } from "./services/v1/keyringService";
import fs from "fs";
import crypto from "crypto";
import canonicalize from "canonicalize";
import { keyClean } from "./tools/keyCleaner";
import fetch from "node-fetch"; // npm install node-fetch if needed

const previous_hash = process.argv[2];
const scope = process.argv[3];
const recordType = process.argv[4];
const keyFile = process.argv[5];
const jsonFile = process.argv[6];
const protocol = "v1";

// 1. Load keys
const privateKeyPem = fs.readFileSync(`/secrets/${keyFile}.key`, "utf8");
const passphrase = process.env.PASSKEY;

const privateKey = {
    key: privateKeyPem,
    passphrase,
};

const publicKeyObj = crypto.createPublicKey(privateKeyPem);
const publicKeyPem = publicKeyObj.export({ type: "spki", format: "pem" });
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

// 4. Canonicalize and sign
const canonical = canonicalize(record);
if (!canonical) throw new Error("Failed to canonicalize record");

const signer = crypto.createSign("sha256");
signer.update(canonical);
signer.end();

const signature = signer.sign(
    {
        key: privateKey,
        passphrase: process.env.PASSKEY,
    },
    "base64"
);

// 5. Add hashes
const recordWithSig = {
    ...record,
    signature,
};

const current_hash = crypto
    .createHash("sha256")
    .update(canonicalize(recordWithSig))
    .digest("base64");

// 6. Final record
const finalRecord = {
    ...recordWithSig,
    current_hash,
    public_key: keyClean(publicKeyPem),
};

// 7. Submit to HodeauxLedger API
const submit = async () => {
    const response = await fetch("http://api.hodeauxledger.org/v1/append", {
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
