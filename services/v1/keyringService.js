import canonicalize from "canonicalize";
import db from "../../tools/db.js";
import crypto from "crypto";
import { Record } from "./recordService.js";
import fs from "fs";
import { generateBase32 } from "../../tools/base32.js";
import { configDotenv } from "dotenv";
import { keyClean } from "../../tools/keyCleaner.js";
import { Read } from "./readService.js";

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
        let workingPubKey;

        if (!fs.existsSync("/secrets/hodeaux.pub")) {
            console.log("Generating keys...");
            const { publicKey, privateKey } = crypto.generateKeyPairSync(
                "rsa",
                {
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
                }
            );

            console.log(
                "Writing keys to /secrets/hodeaux.key and /secrets/hodeaux.pub"
            );
            fs.writeFileSync("/secrets/hodeaux.key", privateKey);
            fs.writeFileSync("/secrets/hodeaux.pub", publicKey);
            workingPubKey = publicKey;
        } else {
            workingPubKey = fs.readFileSync("/secrets/hodeaux.pub", "utf8");
        }
        console.log("Writing genesis record to /ledger/genesis.json");

        /*const payload = {
            name: "HodeauxLedger Core Trust",
            key: keyClean(publicKey),
        };*/

        const key_hash = crypto
            .createHash("sha256")
            .update(keyClean(workingPubKey))
            .digest("base64");

        /*const recordToSign = {
            previous_hash: "",
            protocol: "v1",
            scope: "",
            record_type: "genesis",
            data: payload,
            key: key_hash,
        };*/
        //const genesisRecord = await Record.sign(recordToSign, "hodeaux");
        //const genesisComplete = await Record.create(genesisRecord);

        // load from genesis folder
        const genesisFiles = fs.readdirSync("./genesis");

        let lastHash = "";
        for (const file of genesisFiles.sort((a, b) => a.localeCompare(b))) {
            console.log("Processing file:", file);
            const data = JSON.parse(fs.readFileSync(`./genesis/${file}`));
            if (data.key === "%%KEY_HASH%%") data.key = key_hash;
            const signed = await Record.sign(
                {
                    ...data,
                    previous_hash: lastHash,
                },
                "hodeaux"
            );
            const finalRecord = await Record.create(signed);
            lastHash = finalRecord.current_hash;
        }

        return {
            workingPubKey,
        };
    },

    async ringAdd(scope, roles, key, issued = 0, exp = 0) {
        const key_hash = crypto
            .createHash("sha256")
            .update(key)
            .digest("base64");

        await db(keyringTable).insert({
            scope,
            roles: roles.join(","),
            key,
            key_hash,
            issued: issued ? issued : Date.now(),
            exp: exp ? exp : 0,
        });
        console.log(`Key added to keyring: ${key_hash} [${type}]`);
    },

    async ringUpdate(scope, oldKeyHash, roles, newKey, issued = 0, exp = 0) {
        const key_hash = crypto
            .createHash("256")
            .update(newKey)
            .digest("base64");

        await db(keyringTable)
            .update({
                scope,
                roles: roles.join(","),
                exp: exp ? exp : 0,
                issued: issued ? issued : Date.now(),
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

    async scrapeScope(scope) {
        const records = await Read.scope(scope, "key:");
        for (const record of records) {
            switch (record.record_type) {
                case "key:add":
                    await this.ringAdd(
                        scope,
                        record.data.roles,
                        record.data.key,
                        record.data.issued ? record.data.issued : 0,
                        record.data.exp ? record.data.exp : 0
                    );
                    break;
            }
        }
        return records;
    },
};
