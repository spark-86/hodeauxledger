import canonicalize from "canonicalize";
import db from "../../tools/db.js";
import crypto from "crypto";
import fs from "fs";
import { generateBase32, hex2base32 } from "../../tools/base32.js";
import { Keyring } from "./keyringService.js";
import { keyFormat } from "../../tools/keyCleaner.js";
import { BlockGenesis } from "./blockGenesisService.js";
import { BlockRoot } from "./blockRootService.js";

const recordTable = "records";
const ledgerPath = process.env.LEDGER_PATH || "/ledger";

export const Record = {
    async create(data) {
        if (fs.existsSync("lockfile.txt")) throw new Error("Ledger is locked");
        fs.writeFileSync("lockfile.txt", "Locked");

        let lastHash = "";
        if (data.previous_hash)
            lastHash = fs.readFileSync(
                `${ledgerPath}/lastHash_${data.scope}.txt`,
                "utf8"
            );

        if (
            (!lastHash || lastHash.length !== 44) &&
            data.record_type !== "genesis"
        ) {
            throw new Error("Last hash not found");
        }
        if (lastHash !== data.previous_hash) {
            throw new Error("Previous hash mismatch");
        }

        const createRecord = {
            previous_hash: data.previous_hash, // aka ID
            protocol: "v1",
            scope: data.scope,
            at: Date.now(),
            key: data.key,
            record_type: data.record_type,
            data: data.data,
            signature: data.signature,
        };
        createRecord.current_hash = await this.hash(canonicalize(createRecord));

        if (createRecord.previous_hash) {
            fs.writeFileSync(
                `${ledgerPath}/${hex2base32(
                    new Buffer.from(createRecord.previous_hash, "base64")
                        .toString("hex")
                        .toLowerCase()
                )}.json`,
                JSON.stringify(createRecord)
            );
        } else {
            fs.writeFileSync(
                `${ledgerPath}/genesis.json`,
                JSON.stringify(createRecord)
            );
        }
        fs.writeFileSync(
            `${ledgerPath}/lastHash_${data.scope}.txt`,
            createRecord.current_hash
        );

        // Process what we are supposed to do for this specific
        // type of record.

        await this.processRecord(createRecord);

        await this.addToDb(createRecord);
        fs.unlinkSync("lockfile.txt");
        return data.id;
    },

    async addToDb(data) {
        await db(recordTable).insert(data);
    },

    async verify(data) {
        // 1. Verify record hash
        const providedHash = data.current_hash;
        if (!providedHash) {
            throw new Error("No hash provided");
        }

        const copy = { ...data };
        delete copy.current_hash;

        const calculatedHash = await this.hash(canonicalize(copy));
        if (providedHash !== calculatedHash) {
            throw new Error("Hash verification failed");
        }

        // 2. Reconstruct the object that was signed by the submitter
        const recToVerify = {
            previous_hash: data.previous_hash,
            protocol: data.protocol,
            scope: data.scope,
            key: data.key,
            record_type: data.record_type,
            data: data.data,
        };

        const canonical = canonicalize(recToVerify);
        const signatureBuf = Buffer.from(data.signature, "base64");

        // 3. Reconstruct full PEM if key is base64 only
        let keyPem = await Keyring.ringLookup(data.key);
        if (data.record_type === "genesis")
            keyPem = {
                key: data.data.key,
            };
        if (!keyPem) {
            throw new Error("Key not found in keyring");
        }

        if (keyPem.key?.includes("BEGIN PUBLIC KEY")) {
            keyPem = keyPem.key;
        } else keyPem.key = keyFormat(keyPem.key);

        // 4. Verify signature
        const verify = crypto.createVerify("sha256");
        verify.update(canonical);
        verify.end();

        const verified = verify.verify(keyPem.key, signatureBuf);
        if (!verified) {
            throw new Error("Signature verification failed");
        }

        return true; // ✅ If all checks pass
    },

    async flushRecords() {
        await db(recordTable).delete();
    },

    async hash(data) {
        return crypto.createHash("sha256").update(data).digest("base64");
    },

    async processRecord(record) {
        switch (record.record_type.split(":")[0].toLowerCase()) {
            case "genesis":
                await BlockGenesis.execute(record);
                break;
            case "root":
                await BlockRoot.execute(record);
                break;
            case "scope":
            case "issuing":
                break;
            case "agent":
                break;
            default:
                break;
        }
    },

    async sign(data, keyName) {
        if (!data.previous_hash && data.record_type !== "genesis") {
            throw new Error("No previous hash provided");
        }
        if (!data.record_type) {
            throw new Error("No record type provided");
        }
        const protocol = data.protocol || "v1";
        const scope = data.scope || "";
        const key = data.key || "";
        const record_type = data.record_type || "";
        const dataObject = data.data;

        const recordToHash = {
            previous_hash: data.previous_hash,
            protocol,
            scope,
            key,
            record_type,
            data: dataObject,
        };

        const signature = crypto.createSign("sha256");
        signature.update(canonicalize(recordToHash));
        signature.end();

        const privateKeyFile = fs.readFileSync(
            `/secrets/${keyName}.key`,
            "utf8"
        );
        const privateKey = {
            key: privateKeyFile,
            passphrase: await Keyring.getRSAPassphrase(),
        };

        const signatureBuffer = signature.sign(privateKey, "base64");

        const outRecord = {
            ...recordToHash,
            signature: signatureBuffer,
        };

        return outRecord;
    },
};
