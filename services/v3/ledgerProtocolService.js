import { createDb } from "../../tools/db.js";
import { loadConfig } from "../../tools/v3/config.js";
import { Disk } from "./diskService.js";
import { Record } from "./recordService.js";

const recordTable = "records";

export const LedgerProtocol = {
    /**
     * Validates a record to see if it matches protocol
     * @param {object} record - Record to validate
     * @returns {boolean} - True if the record is valid, throws an error otherwise
     */
    validateRecord(record) {
        const config = loadConfig();
        if (config.verbose) {
            console.log("Validating record...");
            console.dir(record, { depth: null });
        }

        // Check protocol version
        switch (record.protocol) {
            case "v1":
                return this.checkV1(record);
            default:
                throw new Error("Unknown protocol: " + record.protocol);
        }
    },

    /**
     * Validates a record against the v1 protocol
     * @param {object} data - Record to validate
     * @returns {boolean} - True if the record is valid, throws an error otherwise
     */
    checkV1(data) {
        if (!data.protocol) throw new Error("No protocol provided");
        if (data.protocol !== "v1") {
            throw new Error("Unknown protocol: " + data.protocol);
        }

        // Validate the record structure
        const requiredFields = [
            "protocol",
            "scope",
            "nonce",
            "fingerprint",
            "record_type",
            "data",
        ];

        for (const field of requiredFields) {
            if (!(field in data)) {
                throw new Error(`Missing required field: ${field}`);
            }
        }
        return true;
    },
};
