import canonicalize from "canonicalize";
import sodium from "libsodium-wrappers-sumo";

export const Usher = {
    async sign(record, previousHash, usherPrivateKey) {
        await sodium.ready;
        let message = "";
        if (record.protocol === "v1") {
            message = canonicalize({
                previous_hash: previousHash,
                ...record,
                at: Date.now(),
                received_by: await Key.getPublicFromPrivate(usherPrivateKey),
            });
        }
        const messageBytes = sodium.from_string(message);
        const signature = sodium.crypto_sign_detached(
            messageBytes,
            sodium.from_base64(usherPrivateKey)
        );
        return {
            ...record,
            received_signature: sodium.to_base64(signature),
        };
    },

    async verify(record) {
        let message = "";
        if (record.protocol === "v1") {
            message = canonicalize({
                previous_hash: record.previous_hash,
                protocol: record.protocol,
                scope: record.scope,
                nonce: record.nonce,
                fingerprint: record.fingerprint,
                record_type: record.record_type,
                data: record.data,
                signature: record.signature,
                at: record.at,
                received_by: record.received_by,
            });
        }
        const messageBytes = sodium.from_string(message);
        const signatureBytes = sodium.from_base64(record.signature);
        const publicKeyBytes = sodium.from_base64(record.received_by);

        const isValid = sodium.crypto_sign_verify_detached(
            signatureBytes,
            messageBytes,
            publicKeyBytes
        );

        if (!isValid) throw new Error("Signature verification failed");

        return true;
    },
};
