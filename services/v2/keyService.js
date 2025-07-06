import crypto from "crypto";
import { createDb } from "../../tools/db.js";

const keyringTable = "keyring";

export const Key = {
    async getPublicFromPrivate(key, passphrase) {
        const privateKey = {
            key,
            passphrase,
        };
        const publicKeyObj = crypto.createPublicKey(privateKey);
        const publicKeyPem = publicKeyObj.export({
            type: "spki",
            format: "pem",
        });
        return publicKeyPem;
    },

    padKey(key, isPrivate = false) {
        // Add \n to blob for each line
        const formatted = key.match(/.{1,64}/g).join("\n");
        if (isPrivate) {
            return (
                "-----BEGIN PRIVATE KEY-----\n" +
                formatted +
                "\n-----END PRIVATE KEY-----"
            );
        } else {
            return (
                "-----BEGIN PUBLIC KEY-----\n" +
                formatted +
                "\n-----END PUBLIC KEY-----"
            );
        }
    },

    rawPublicKey(key) {
        const lines = key.split("\n");
        const base64lines = lines.filter(
            (line) => !line.startsWith("-----") && line.trim() !== ""
        );
        const base64 = base64lines.join("");
        return Buffer.from(base64, "base64");
    },

    async calcFingerprint(key) {
        return crypto.createHash("sha256").update(key).digest("base64");
    },

    async generatePair(passphrase) {
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
                passphrase,
            },
        });

        return { publicKey, privateKey };
    },

    /**
     * Adds a key to the keyring in the database cache
     * @param {string} scope - Ledger scope
     * @param {array} roles - Key roles
     * @param {string} key - Raw public key
     * @param {number} issued - When the key was issued
     * @param {number} exp - When the key expires
     */
    async ringAdd(scope, roles, key, issued = 0, exp = 0) {
        const db = createDb();

        const fingerprint = await this.calcFingerprint(this.rawPublicKey(key));

        await db(keyringTable).insert({
            scope,
            roles: roles.join(","),
            key,
            fingerprint,
            exp: exp ? exp : 0,
        });
        console.log(`Key added to keyring: ${fingerprint} [${scope}]`);
    },

    async ringFlush() {
        const db = createDb();
        await db(keyringTable).delete();
    },

    async ringFind(scope, fingerprint) {
        const db = createDb();
        const key = await db(keyringTable)
            .where({
                scope,
                fingerprint,
            })
            .first();
        key.roles = key.roles.split(",");
        return key;
    },
};
