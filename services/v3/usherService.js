import sodium from "libsodium-wrappers-sumo";
import { Key } from "./keyService.js";

export const Usher = {
    async signPayload(record, privateKey, previous_hash = "") {
        await sodium.ready;
        const messageBytes = sodium.from_string(JSON.stringify(record));
        const signature = sodium.crypto_sign_detached(messageBytes, privateKey);
        return {
            ...record,
            previous_hash,
            at: Date.now(),
            received_by: await Key.getPublicKey(sodium.to_base64(privateKey)),
            received_signature: sodium.to_base64(signature),
        };
    },

    async verifySignature(record, publicKey) {
        await sodium.ready;
        const messageBytes = sodium.from_string(JSON.stringify(record));
        const signatureBytes = sodium.from_base64(record.received_signature);
        const publicKeyBytes = sodium.from_base64(publicKey);

        const isValid = sodium.crypto_sign_verify_detached(
            signatureBytes,
            messageBytes,
            publicKeyBytes
        );

        if (!isValid) throw new Error("Signature verification failed");

        return true;
    },

    async processAppend(message) {},
};
