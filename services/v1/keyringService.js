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
        if (fs.existsSync(ledgerPath + "/genesis.json", fs.constants.F_OK)) {
            return JSON.parse(
                fs.readFileSync(ledgerPath + "/genesis.json", "utf8")
            );
        }

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

        console.log(publicKey);

        const payload = {
            name: "HodeauxLedger Core Trust",
            key: keyClean(publicKey),
        };

        const recordToSign = {
            previous_hash: "",
            protocol: "v1",
            scope: "",
            at: Date.now(),
            record_type: "genesis",
            data: payload,
        };

        const genesisRecord = await Record.sign(recordToSign, "hodeaux");

        fs.writeFileSync("/secrets/hodeaux.key", privateKey);
        fs.writeFileSync("/secrets/hodeaux.pub", publicKey);
        await Record.create(genesisRecord);

        return {
            publicKey,
            privateKey,
        };
    },

    async addRootAuthority(name, key, previous_hash) {
        // 1. Canonicalize payload
        const canonical = canonicalize({
            name,
            key,
        });

        // 2. Load master key (private key from secure file)
        const masterPrivateKey = crypto.createPrivateKey({
            key: await this.getMaster(),
            format: "pem",
            type: "pkcs8",
            cipher: "aes-256-cbc",
            passphrase: await this.getRSAPassphrase(),
        });
        console.log(masterPrivateKey);

        const signer = crypto.createSign("sha256");
        signer.update(canonical);
        signer.end();

        // 3. Sign the payload with the master key
        const signature = signer.sign(
            {
                key: masterPrivateKey,
                passphrase: await this.getRSAPassphrase(),
            },
            "base64"
        );

        // 4. Hash the signature for optional integrity tagging
        const sigHash = crypto
            .createHash("sha256")
            .update(signature)
            .digest("base64");

        // 5. Hash the master public key
        const masterPublicKey = crypto.createPublicKey(masterPrivateKey);

        const keyHash = crypto
            .createHash("sha256")
            .update(
                masterPublicKey
                    .export({ format: "pem", type: "spki" })
                    .replace("-----BEGIN PUBLIC KEY-----\n", "")
                    .replace("-----END PUBLIC KEY-----", "")
                    .replace("\n", "")
            )
            .digest("base64");

        // 6. Create record
        const rootRecord = {
            previous_hash,
            protocol: "v1",
            scope: "",
            at: Date.now(),
            record_type: "root:add",
            data: data, // raw data (not canonicalized string)
            signature: sigHash,
            key: keyHash,
            previous_hash,
        };

        rootRecord.current_hash = crypto
            .createHash("sha256")
            .update(JSON.stringify(rootRecord))
            .digest("base64");

        await Record.create(rootRecord);

        return rootRecord;
    },

    async addIssuingAuthority(data) {},

    async ringAdd(type, key) {
        const key_hash = crypto
            .createHash("sha256")
            .update(key)
            .digest("base64");

        await db(keyringTable).insert({
            key_type: type,
            key,
            key_hash,
        });
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
