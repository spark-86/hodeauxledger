import canonicalize from "canonicalize";
import db from "../../tools/db.js";
import crypto from "crypto";
import { Record } from "./recordService.js";
import fs from "fs";
import { generateBase32 } from "../../tools/base32.js";
import { configDotenv } from "dotenv";
import { keyClean } from "../../tools/keyCleaner.js";

configDotenv();

const ledgerPath = process.env.LEDGER_PATH || "/ledger";
const recordTable = "records";
const keyringTable = "keyring";

export const Keyring = {
    async getRSAPassphrase() {
        return process.env.PASSKEY;
    },

    async getMaster() {
        const masterKey = fs.readFileSync("/secrets/hodeaux.key", "utf8");
        return masterKey;
    },

    async genesis() {
        console.log("Generating genesis record...");
        if (fs.existsSync(ledgerPath + "/genesis.json", fs.constants.F_OK)) {
            return JSON.parse(
                fs.readFileSync(ledgerPath + "/genesis.json", "utf8")
            );
        }

        console.log("Generating keys...");
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
                passphrase: process.env.PASSKEY,
            },
        });

        const payload = {
            name: "HodeauxLedger Core Trust",
            key: keyClean(publicKey),
        };

        const key_hash = crypto
            .createHash("sha256")
            .update(publicKey)
            .digest("base64");

        const recordToSign = {
            previous_hash: "",
            protocol: "v1",
            scope: "",
            record_type: "genesis",
            data: payload,
            key: key_hash,
        };
        console.log(
            "Writing keys to /secrets/hodeaux.key and /secrets/hodeaux.pub"
        );
        fs.writeFileSync("/secrets/hodeaux.key", privateKey);
        fs.writeFileSync("/secrets/hodeaux.pub", publicKey);
        console.log("Writing genesis record to /ledger/genesis.json");
        const genesisRecord = await Record.sign(recordToSign, "hodeaux");
        const genesisComplete = await Record.create(genesisRecord);

        // load from "genesis_records.jsonl" and sign them all
        let hash = genesisComplete.current_hash;
        const initialRecords = fs
            .readFileSync("genesis_records.jsonl", "utf8")
            .split("\n");
        for (const record of initialRecords) {
            const signedRecord = await Record.sign(
                {
                    ...JSON.parse(record),
                    previous_hash: hash,
                },
                "hodeaux"
            );
            const finalRecord = await Record.create(signedRecord);
            hash = finalRecord.current_hash;
        }
        return genesisRecord;

        return {
            publicKey,
            privateKey,
        };
    },

    async ringAdd(type, key, issued = 0, exp = 0) {
        const key_hash = crypto
            .createHash("sha256")
            .update(key)
            .digest("base64");

        await db(keyringTable).insert({
            key_type: type,
            key,
            key_hash,
            issued: issued ? issued : Date.now(),
            exp: exp ? exp : 0,
        });
        console.log(`Key added to keyring: ${key_hash} [${type}]`);
    },

    async ringUpdate(oldKeyHash, type, newKey) {
        const key_hash = crypto
            .createHash("256")
            .update(newKey)
            .digest("base64");

        await db(keyringTable)
            .update({
                key_type: type,
                key: newKey,
                key_hash,
            })
            .where({ key_hash: oldKeyHash });
    },

    async ringRevoke(keyHash) {
        await db(keyringTable).delete().where({ key_hash: keyHash });
    },

    async ringFlush() {
        await db(keyringTable).delete();
    },

    async ringLookup(key_hash) {
        return await db(keyringTable).where({ key_hash }).first();
    },
};
