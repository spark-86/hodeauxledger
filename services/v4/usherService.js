import canonicalize from "canonicalize";
import sodium from "libsodium-wrappers-sumo";
import { unixMsToGt } from "../../tools/v4/time.js";
import { Time } from "./timeService.js";
import { Key } from "./keyService.js";
import { loadConfig } from "../../tools/v4/config.js";
import crypto from "crypto";

export const Usher = {
    async sign(record, previousHash, usherPrivateKey) {
        await sodium.ready;
        const config = loadConfig();

        const publicKey = await Key.getPublicFromPrivate(usherPrivateKey);

        // Handle genesis time
        const isGenesis =
            record.record_type === "genesis" && record.scope === "";
        if (isGenesis) Time.setEpoch(Date.now());

        const atTime = isGenesis
            ? "0"
            : Time.unixMsToMicro(Date.now()).toString();
        //console.log("Signing at time:", atTime);

        // Build the canonical record for signing
        const recordToSign = {
            previous_hash: previousHash,
            ...record,
            at: atTime,
            signatures: [
                ...(record.signatures || []),
                {
                    fingerprint: publicKey,
                    type: "usher",
                },
            ],
        };

        const message = canonicalize(recordToSign);
        const messageBytes = sodium.from_string(message);

        const signature = sodium.crypto_sign_detached(
            messageBytes,
            sodium.from_base64(usherPrivateKey)
        );

        // Attach the actual signature to the record
        const finalRecord = {
            ...recordToSign,
            signatures: [
                ...(record.signatures || []),
                {
                    fingerprint: publicKey,
                    signature: sodium.to_base64(signature),
                    type: "usher",
                },
            ],
        };

        // Generate current_hash
        const hash = crypto.createHash("sha256");
        hash.update(canonicalize(finalRecord));
        const currentHash = hash.digest("base64");

        return {
            ...finalRecord,
            current_hash: currentHash,
        };
    },

    async verify(record) {
        let message = "";
        const sigs = record.signatures.filter((s) => s.type !== "usher");
        if (sigs.length === 0)
            if (record.protocol === "v1") {
                message = canonicalize({
                    previous_hash: record.previous_hash,
                    protocol: record.protocol,
                    scope: record.scope,
                    nonce: record.nonce,
                    at: record.at,
                    record_type: record.record_type,
                    data: record.data,
                    signatures: sigs,
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
