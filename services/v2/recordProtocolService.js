export const RecordProtocol = {
    async validateRecord(record) {
        const config = loadConfig();
        if (config.verbose) console.dir(record, { depth: null });

        // Check protocol version
        if (record.protocol !== "v1") {
            throw new Error("Unknown protocol: " + record.protocol);
        }

        // Validate the record structure
        const requiredFields = [
            "previous_hash",
            "protocol",
            "scope",
            "nonce",
            "at",
            "fingerprint",
            "record_type",
            "data",
        ];

        for (const field of requiredFields) {
            if (!(field in record)) {
                throw new Error(`Missing required field: ${field}`);
            }
        }

        // Additional validation can be added here as needed

        return true;
    },
};
