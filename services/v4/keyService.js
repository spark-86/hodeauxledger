import canonicalize from "canonicalize";
import sodium from "libsodium-wrappers-sumo";

export const Key = {
    async generate() {
        await sodium.ready;

        const keyPair = sodium.crypto_sign_keypair();
        const publicKey = sodium.to_base64(keyPair.publicKey);
        const privateKey = sodium.to_base64(keyPair.privateKey);

        return { publicKey, privateKey };
    },

    async sign(record, privateKey) {
        await sodium.ready;

        let recordToSign = {};
        if (record.protocol === "v1") {
            recordToSign = {
                protocol: record.protocol,
                scope: record.scope,
                nonce: record.nonce ?? Date.now().toString(),
                fingerprint: record.fingerprint,
                record_type: record.record_type,
                data: record.data,
            };
        }
        const message = canonicalize(recordToSign);
        const messageBytes = sodium.from_string(message);
        const signature = sodium.crypto_sign_detached(
            messageBytes,
            sodium.from_base64(privateKey)
        );
        return {
            ...recordToSign,
            signature: sodium.to_base64(signature),
        };
    },

    async verify(record) {
        let recordToVerify = {};
        if (record.protocol === "v1") {
            recordToVerify = {
                protocol: record.protocol,
                scope: record.scope,
                nonce: record.nonce,
                fingerprint: record.fingerprint,
                record_type: record.record_type,
                data: record.data,
            };
        }
        const message = canonicalize(recordToVerify);
        const messageBytes = sodium.from_string(message);
        const signatureBytes = sodium.from_base64(record.signature);
        const publicKeyBytes = sodium.from_base64(record.fingerprint);

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

        const keyBytes = sodium.from_base64(key);
        const passphraseBytes = sodium.from_string(passphrase);
        const nonce = sodium.randombytes_buf(
            sodium.crypto_secretbox_NONCEBYTES
        );
        const encrypted = sodium.crypto_secretbox_easy(
            passphraseBytes,
            nonce,
            keyBytes
        );
        return {
            nonce: sodium.to_base64(nonce),
            encrypted: sodium.to_base64(encrypted),
        };
    },

    async getPublicFromPrivate(privateKey) {
        // Takes the private key and generates the public key from it
        await sodium.ready;

        const keyPair = sodium.crypto_sign_keypair_from_secretkey(
            sodium.from_base64(privateKey)
        );
        return sodium.to_base64(keyPair.publicKey);
    },
};
