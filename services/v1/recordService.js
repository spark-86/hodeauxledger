import canonicalize from "canonicalize";
import db from "../../tools/db.js";
import crypto from "crypto";
import fs from "fs";
import { generateBase32, hex2base32 } from "../../tools/base32.js";
import { Keyring } from "./keyringService.js";
import { keyFormat } from "../../tools/keyCleaner.js";

const recordTable = "records";
const ledgerPath = process.env.LEDGER_PATH || "/ledger";

export const Record = {
    async create(data) {
        if (fs.existsSync("lockfile.txt")) throw new Error("Ledger is locked");
        fs.writeFileSync("lockfile.txt");

        const lastHash = fs.readFileSync(
            `${ledgerPath}/lastHash_${data.scope}.txt`,
            "utf8"
        );

        if (!lastHash || lastHash.length !== 44) {
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
        createRecord.current_hash = this.hash(createRecord);

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
        const copy = { ...data };
        delete copy.current_hash;

        const calculatedHash = this.hash(copy);
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
        return crypto
            .createHash("sha256")
            .update(canonicalize(data))
            .digest("base64");
    },

    async processRecord(record) {},
};
