import canonicalize from "canonicalize";
import sodium from "libsodium-wrappers-sumo";

export const Network = {
    async composeMessage(type, scope, payload, nonce, fingerprint) {
        const message = {
            type,
            scope,
            payload,
            nonce,
            fingerprint,
        };
        return message;
    },

    async signMessage(message, privateKey) {
        const messageBytes = sodium.from_string(canonicalize(message));
        const signature = sodium.crypto_sign_detached(
            messageBytes,
            sodium.from_base64(privateKey)
        );
        return {
            ...message,
            signature: sodium.to_base64(signature),
        };
    },

    async verifyMessage(message) {
        const messageToVerify = {
            type: message.type,
            scope: message.scope,
            payload: message.payload,
            nonce: message.nonce,
            fingerprint: message.fingerprint,
        };
        const messageBytes = sodium.from_string(canonicalize(messageToVerify));
        const signatureBytes = sodium.from_base64(message.signature);
        const publicKeyBytes = sodium.from_base64(message.fingerprint);

        return sodium.crypto_sign_verify_detached(
            signatureBytes,
            messageBytes,
            publicKeyBytes
        );
    },
};
