import { loadConfig } from "./configService.js";

export const RecordProtocol = {
    async validateRecord(record) {
        const config = loadConfig();
        if (config.verbose) console.dir(record, { depth: null });

        // Check protocol version
        if (record.payload.protocol !== "v1") {
            throw new Error("Unknown protocol: " + record.protocol);
        }

        // Validate the record structure
        const requiredFields = [
            "type",
            "scope",
            "payload",
            "nonce",
            "at",
            "fingerprint",
        ];

        for (const field of requiredFields) {
            if (!(field in record)) {
                throw new Error(`Missing required field: ${field}`);
            }
        }

        // Additional validation can be added here as needed

        return true;
    },

    async signRecord(record, privateKey) {
        await sodium.ready;
        const messageBytes = sodium.from_string(canonicalize(record));
        const signature = sodium.crypto_sign_detached(messageBytes, privateKey);
        return {
            ...record,
            signature: sodium.to_base64(signature),
        };
    },
};
