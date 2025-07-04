import fs from "fs";
import crypto from "crypto";
import canonicalize from "canonicalize";
import { keyClean } from "./tools/keyCleaner.js";
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

const publicKeyObj = crypto.createPublicKey(privateKey);
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

console.dir(
    {
        previous_hash,
        protocol,
        scope,
        key: publicKeyHash,
        record_type: recordType,
        data,
    },
    { depth: null }
);

const record = {
    previous_hash,
    protocol,
    scope,
    key: publicKeyHash,
    record_type: recordType,
    data,
};

const finalRecord = await Record.sign(canonicalize(record), privateKey);

// 7. Submit to HodeauxLedger API
const submit = async () => {
    console.log("Submitting record to HodeauxLedger API...");
    console.dir(finalRecord, { depth: null });
    return;
};

submit().catch((err) => {
    console.error("❌ Error submitting record:");
    console.error(err);
    process.exit(1);
});
