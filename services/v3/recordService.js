import canonicalize from "canonicalize";
import sodium from "libsodium-wrappers-sumo";
import { Keyring } from "./keyringService.js";
import crypto from "crypto";
import { RecordTypeKey } from "./recordTypeKeyService.js";

export const Record = {
    async sign(data, privateKey) {
        await sodium.ready;
        console.log("Signing the following:");
        console.dir(data, { depth: null });
        const messageBytes = sodium.from_string(canonicalize(data));
        const signature = sodium.crypto_sign_detached(messageBytes, privateKey);
        return {
            ...data,
            signature: sodium.to_base64(signature),
        };
    },

    async calcCurrentHash(data) {
        const canonical = canonicalize(data);
        const hash = crypto.createHash("sha256");
        hash.update(canonical);
        return hash.digest("base64");
    },

    async verify(data, publicKey) {
        await sodium.ready;
        const recordToVerify = {
            protocol: data.protocol,
            scope: data.scope,
            nonce: data.nonce,
            fingerprint: data.fingerprint,
            record_type: data.record_type,
            data: data.data,
        };
        console.log("Verifying this R⬢:");
        console.dir(recordToVerify, { depth: null });
        const canonical = canonicalize(recordToVerify);
        const messageBytes = sodium.from_string(canonical);
        const signatureBytes = sodium.from_base64(data.signature);
        const publicKeyBytes = sodium.from_base64(publicKey);

        const isValid = sodium.crypto_sign_verify_detached(
            signatureBytes,
            messageBytes,
            publicKeyBytes
        );

        if (!isValid) throw new Error("Signature verification failed");

        return true;
    },

    async processRecord(data) {
        if (!data.protocol)
            throw new Error("No protocol provided in R⬢: " + data);
        if (data.protocol === "v1") {
            const category = data.record_type.split(":");
            switch (category[0]) {
                case "genesis":
                    await Keyring.add("", data.data.key, ["core"]);
                    break;
                case "root":
                    break;
                case "key":
                    await RecordTypeKey.process(data);
                    break;
                default:
                    console.log("Unknown R⬢ type: " + data.record_type);
            }
        }
    },
};
