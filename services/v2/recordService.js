import canonicalize from "canonicalize";
import crypto from "crypto";
import { Key } from "./keyService.js";

export const Record = {
    /**
     * This signs our records for submission to the ledger
     * @param {object} data - Record to sign
     * @param {string} privateKey - Hot private key
     * @returns {object} - Signed record
     */
    async sign(data, privateKey) {
        // Make sure we have what we need
        if (!data.previous_hash && data.record_type !== "genesis")
            throw new Error("No previous hash provided");
        if (!data.protocol) throw new Error("No protocol provided");
        if (!data.record_type) throw new Error("No record type provided");
        // Prep record
        const recordToSign = {
            previous_hash: data.previous_hash,
            protocol: data.protocol,
            scope: data.scope,
            at: Date.now(),
            fingerprint: data.fingerprint,
            record_type: data.record_type,
            data: data.data,
        };
        // sign
        const signature = crypto.createSign("sha256");
        signature.update(canonicalize(recordToSign));
        signature.end();
        const signatureBuffer = signature.sign(privateKey, "base64");
        const outRecord = {
            ...recordToSign,
            signature: signatureBuffer,
        };
        outRecord.current_hash = await this.calcCurrentHash(outRecord);
        return outRecord;
    },

    async calcCurrentHash(data) {
        const canonical = canonicalize(data);
        const hash = crypto.createHash("sha256");
        hash.update(canonical);
        return hash.digest("base64");
    },

    async verify(data, publicKey) {
        if (!data.protocol) throw new Error("No protocol provided");
        if (data.protocol === "v1") {
            const recordToVerify = {
                previous_hash: data.previous_hash,
                protocol: data.protocol,
                scope: data.scope,
                at: data.at,
                fingerprint: data.fingerprint,
                record_type: data.record_type,
                data: data.data,
            };
            const canonical = canonicalize(recordToVerify);
            const signatureBuf = Buffer.from(data.signature, "base64");
            const verify = crypto.createVerify("sha256");
            verify.update(canonical);
            verify.end();
            const verified = verify.verify(publicKey, signatureBuf);
            if (!verified) throw new Error("Signature verification failed");
            return true;
        } else {
            throw new Error("Unknown protocol: " + data.protocol);
        }
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
