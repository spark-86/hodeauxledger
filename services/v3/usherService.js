import sodium from "libsodium-wrappers-sumo";
import { Key } from "./keyService.js";

export const Usher = {
    async signPayload(record, privateKey) {
        await sodium.ready;
        const messageBytes = sodium.from_string(JSON.stringify(record));
        const signature = sodium.crypto_sign_detached(messageBytes, privateKey);
        return {
            ...record,
            at: Date.now(),
            received_by: await Key.getPublicKey(sodium.to_base64(privateKey)),
            received_signature: sodium.to_base64(signature),
        };
    },
};
