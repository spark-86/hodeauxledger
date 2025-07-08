import canonicalize from "canonicalize";
import crypto from "crypto";
import { Key } from "./keyService.js";
import sodium from "libsodium-wrappers-sumo";
import { loadConfig } from "./configService.js";

export const Record = {
    /**
     * This signs our records for submission to the ledger
     * @param {object} data - Record to sign
     * @param {string} privateKey - Hot private key
     * @returns {object} - Signed record
     */
    async sign(data, base64PrivateKey) {
        await sodium.ready;

        const privateKey = sodium.from_base64(base64PrivateKey);
        // Make sure we have what we need
        if (!data.previous_hash && data.record_type !== "genesis")
            throw new Error("No previous hash provided");
        if (!data.protocol) throw new Error("No protocol provided");
        if (!data.record_type) throw new Error("No record type provided");
        // Prep record
        if (data.protocol === "v1") {
            const recordToSign = {
                previous_hash: data.previous_hash,
                protocol: data.protocol,
                scope: data.scope,
                nonce:
                    data.nonce || sodium.to_base64(sodium.randombytes_buf(32)),
                fingerprint: data.fingerprint,
                record_type: data.record_type,
                data: data.data,
            };
            // sign
            const messageBytes = sodium.from_string(canonicalize(recordToSign));
            const signature = sodium.crypto_sign_detached(
                messageBytes,
                privateKey
            );
            const outRecord = {
                ...recordToSign,
                signature: sodium.to_base64(signature),
            };

            // Removed the hash because we need to calc it AFTER the usher
            // signs the record.
            //outRecord.current_hash = await this.calcCurrentHash(outRecord);
            return outRecord;
        }
    },

    async calcCurrentHash(data) {
        const canonical = canonicalize(data);
        const hash = crypto.createHash("sha256");
        hash.update(canonical);
        return hash.digest("base64");
    },

    async verify(data, publicKey) {
        await sodium.ready;
        const config = loadConfig();

        if (!data.protocol) throw new Error("No protocol provided");

        if (data.protocol !== "v1") {
            throw new Error("Unknown protocol: " + data.protocol);
        }
        if (config.verbose) console.dir(data, { depth: null });
        const recordToVerify = {
            previous_hash: data.previous_hash,
            protocol: data.protocol,
            scope: data.scope,
            nonce: data.nonce,
            at: data.at,
            fingerprint: data.fingerprint,
            record_type: data.record_type,
            data: data.data,
        };

        if (config.verbose) console.dir(recordToVerify, { depth: null });

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
            throw new Error("No protocol provided in record: " + data);
        if (data.protocol === "v1") {
            switch (data.record_type) {
                case "genesis":
                    // This did add the key to the db, but that resulted
                    // in duplicate keys because we have to manually strap
                    // the core key
                    break;
                case "root:add":
                    await Key.ringAdd(
                        data.scope,
                        ["root", "steward"],
                        data.data.key
                    );
                    break;
                default:
                    console.log("Unknown record type: " + data.record_type);
            }
        }
    },
};
