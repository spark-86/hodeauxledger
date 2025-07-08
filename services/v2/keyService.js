import { createDb } from "../../tools/db.js";
import sodium from "libsodium-wrappers-sumo";
import fs from "fs";

const keyringTable = "keyring";

export const Key = {
    async getPublicFromPrivate(key, passphrase) {
        await sodium.ready;
        let binPrivateKey;
        if (typeof key === "string") {
            binPrivateKey = sodium.from_base64(key);
        } else if (key instanceof Uint8Array) {
            binPrivateKey = key;
        } else {
            throw new TypeError("Unsupported private key format");
        }
        const seed = binPrivateKey.slice(0, 32);
        const { publicKey } = sodium.crypto_sign_seed_keypair(seed);
        return sodium.to_base64(publicKey);
    },

    async encryptPrivateKey(key, passphrase) {
        await sodium.ready;
        const salt = sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES);
        const nonce = sodium.randombytes_buf(
            sodium.crypto_secretbox_NONCEBYTES
        );
        const privateKey = sodium.crypto_pwhash(
            sodium.crypto_secretbox_KEYBYTES,
            passphrase,
            salt,
            sodium.crypto_pwhash_OPSLIMIT_MODERATE,
            sodium.crypto_pwhash_MEMLIMIT_MODERATE,
            sodium.crypto_pwhash_ALG_DEFAULT
        );
        const rawKey = sodium.from_base64(key);
        const encrypted = sodium.crypto_secretbox_easy(
            rawKey,
            nonce,
            privateKey
        );

        return {
            nonce: sodium.to_base64(nonce),
            encrypted: sodium.to_base64(encrypted),
            salt: sodium.to_base64(salt),
        };
    },

    async decryptPrivateKey({ nonce, encrypted, salt, passphrase }) {
        await sodium.ready;
        const nonceBuf = sodium.from_base64(nonce);
        const encryptedBuf = sodium.from_base64(encrypted);
        const saltBuf = sodium.from_base64(salt);
        const privateKey = sodium.crypto_pwhash(
            sodium.crypto_secretbox_KEYBYTES,
            passphrase,
            saltBuf,
            sodium.crypto_pwhash_OPSLIMIT_MODERATE,
            sodium.crypto_pwhash_MEMLIMIT_MODERATE,
            sodium.crypto_pwhash_ALG_DEFAULT
        );
        const decrypted = sodium.crypto_secretbox_open_easy(
            encryptedBuf,
            nonceBuf,
            privateKey
        );
        return sodium.to_base64(decrypted);
    },

    async calcFingerprint(key) {
        await sodium.ready;
        const keyInBin = sodium.from_base64(key);
        if (keyInBin.length === 32) {
            return key;
        } else {
            return await this.getPublicFromPrivate(key);
        }
    },

    async generatePair() {
        await sodium.ready;
        const keyPair = sodium.crypto_sign_keypair();
        return {
            publicKey: sodium.to_base64(keyPair.publicKey),
            privateKey: sodium.to_base64(keyPair.privateKey),
        };
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
        await sodium.ready;

        const db = createDb();

        const fingerprint = key;

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

    async privateKeyFromDisk(path, keyType, passphrase = "") {
        const ext = passphrase ? ".enc.json" : ".hot.json";
        if (!fs.existsSync(path + "/" + keyType + ext))
            throw new Error(`Cannot find keyfile: ${path}/${keyType}${ext}`);
        const keyFile = JSON.parse(fs.readFileSync(path + "/" + keyType + ext));
        if (keyFile.passphrase) {
            keyFile.passphrase = passphrase;
            return await this.decryptPrivateKey({ keyFile });
        } else {
            return keyFile.key;
        }
    },
};
