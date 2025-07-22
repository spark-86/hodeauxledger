import canonicalize from "canonicalize";
import { decrypt } from "dotenv";
import sodium from "libsodium-wrappers-sumo";
import { loadConfig } from "../../tools/v4/config.js";

export const Key = {
    async generate() {
        await sodium.ready;

        const keyPair = sodium.crypto_sign_keypair();
        const publicKey = sodium.to_base64(keyPair.publicKey);
        const privateKey = sodium.to_base64(keyPair.privateKey);

        return { publicKey, privateKey };
    },

    async sign(record, signerType, privateKey) {
        await sodium.ready;

        const fingerprint = await this.getPublicFromPrivate(privateKey);

        // Enforce ownership logic
        const ownerSig = record.signatures.find((s) => s.type === "owner");

        if (!ownerSig && signerType !== "owner") {
            throw new Error("Cannot sign: missing owner signature");
        }
        if (ownerSig && signerType === "owner" && ownerSig.signature) {
            throw new Error("Record already has an owner signature");
        }

        // Canonical payload: only the record content (not signatures array)
        const recordToSign = {
            protocol: record.protocol,
            scope: record.scope,
            nonce: record.nonce ?? Date.now().toString(),
            record_type: record.record_type,
            data: record.data,
        };

        const message = canonicalize(recordToSign);
        const messageBytes = sodium.from_string(message);
        const signatureBytes = sodium.crypto_sign_detached(
            messageBytes,
            sodium.from_base64(privateKey)
        );

        // Build new signature entry
        const newSig = {
            fingerprint,
            type: signerType,
            signature: sodium.to_base64(signatureBytes),
        };

        // Filter out any previous signature by the same signer+type
        const filteredSigs = record.signatures.filter(
            (s) => !(s.fingerprint === fingerprint && s.type === signerType)
        );

        return {
            ...record,
            nonce: record.nonce ?? recordToSign.nonce, // ensure it's preserved
            signatures: [...filteredSigs, newSig],
        };
    },

    async verify(record, type = "owner") {
        let recordToVerify = {};
        if (record.protocol === "v1") {
            recordToVerify = {
                protocol: record.protocol,
                scope: record.scope,
                nonce: record.nonce,
                record_type: record.record_type,
                data: record.data,
            };
        }
        const signer = record.signatures.find((s) => s.type === type);
        if (!signer) throw new Error("Specified signer not found");
        const message = canonicalize(recordToVerify);
        const messageBytes = sodium.from_string(message);
        const signatureBytes = sodium.from_base64(signer.signature);
        const publicKeyBytes = sodium.from_base64(signer.fingerprint);

        const isValid = sodium.crypto_sign_verify_detached(
            signatureBytes,
            messageBytes,
            publicKeyBytes
        );

        if (!isValid) throw new Error("Signature verification failed");

        return true;
    },

    async encrypt(key, passphrase) {
        await sodium.ready;

        const masterKeyBytes = sodium.from_base64(key);
        const passphraseBytes = sodium.from_string(passphrase);

        const salt = sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES);

        // Derive 32-byte encryption key from passphrase and salt
        const derivedKey = sodium.crypto_pwhash(
            sodium.crypto_secretbox_KEYBYTES, // 32 bytes
            passphraseBytes,
            salt,
            sodium.crypto_pwhash_OPSLIMIT_MODERATE,
            sodium.crypto_pwhash_MEMLIMIT_MODERATE,
            sodium.crypto_pwhash_ALG_DEFAULT
        );

        const nonce = sodium.randombytes_buf(
            sodium.crypto_secretbox_NONCEBYTES
        );

        const ciphertext = sodium.crypto_secretbox_easy(
            masterKeyBytes,
            nonce,
            derivedKey
        );

        return {
            salt: sodium.to_base64(salt),
            nonce: sodium.to_base64(nonce),
            encrypted: sodium.to_base64(ciphertext),
        };
    },

    async decrypt(key, passphrase) {
        await sodium.ready;
        const config = loadConfig();
        const saltBytes = sodium.from_base64(key.salt);
        const nonceBytes = sodium.from_base64(key.nonce);
        const ciphertextBytes = sodium.from_base64(key.encrypted);

        // Derive 32-byte encryption key from passphrase and salt
        const derivedKey = sodium.crypto_pwhash(
            sodium.crypto_secretbox_KEYBYTES, // 32 bytes
            sodium.from_string(passphrase),
            saltBytes,
            sodium.crypto_pwhash_OPSLIMIT_MODERATE,
            sodium.crypto_pwhash_MEMLIMIT_MODERATE,
            sodium.crypto_pwhash_ALG_DEFAULT
        );
        const decrypted = sodium.crypto_secretbox_open_easy(
            ciphertextBytes,
            nonceBytes,
            derivedKey
        );
        if (!decrypted) throw new Error("Decryption failed");
        if (config.verbose) {
            console.log("Decrypted key:", sodium.to_base64(decrypted));
            console.log(
                "Public: ",
                await this.getPublicFromPrivate(sodium.to_base64(decrypted))
            );
        }
        return decrypted;
    },

    async getPublicFromPrivate(privateKey) {
        await sodium.ready;

        const secretKeyBytes = sodium.from_base64(privateKey);
        const publicKeyBytes =
            sodium.crypto_sign_ed25519_sk_to_pk(secretKeyBytes);

        return sodium.to_base64(publicKeyBytes);
    },
};
