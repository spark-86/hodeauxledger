import fs from "fs";
import { loadConfig } from "../../tools/v3/config.js";
import path from "path";
import { fileURLToPath } from "url";

export const Disk = {
    /**
     * Loads a record from the disk
     * @param {string} hash - base32 version of the "previous_hash" of the record
     * @returns {object} The record requested
     */
    async loadRecord(scope, hash) {
        const config = loadConfig();
        const __dirname = new URL(config.ledger, import.meta.url).pathname;
        const path = scope
            ? `${__dirname}/${scope}/${hash}.json`
            : `${__dirname}/${hash}.json`;
        if (!fs.existsSync(path)) throw new Error("Record not found");
        return JSON.parse(fs.readFileSync(path));
    },

    /**
     * Saves a record to the disk
     * @param {object} record - The record to save
     */
    async saveRecord(scope, record) {
        if (!record.previous_hash && record.record_type !== "genesis") {
            throw new Error("No previous hash provided");
        }

        const config = loadConfig();

        // Resolve the absolute base path of the ledger
        const ledgerPath = path.resolve(
            path.dirname(fileURLToPath(import.meta.url)),
            config.ledger
        );

        // Sanitize input to prevent directory traversal
        const safeScope = scope?.replace(/[^a-zA-Z0-9_\-]/g, "_") ?? "";
        const safeHash = record.previous_hash.replace(/[^a-zA-Z0-9_\-]/g, "_");

        const targetDir = scope ? path.join(ledgerPath, safeScope) : ledgerPath;

        const targetPath = path.join(targetDir, `${safeHash}.json`);

        try {
            // Ensure target directory exists
            fs.mkdirSync(targetDir, { recursive: true });

            // Write record to disk
            fs.writeFileSync(targetPath, JSON.stringify(record, null, 2));
        } catch (err) {
            console.error("❌ Failed to save record:", err);
        }
    },

    /**
     * Updates the tip of the ledger
     * @param {string} scope - Ledger scope to adjust
     * @param {string} hash - Current hash of the latest record in this scope
     */
    async updateTip(scope, hash) {
        const config = loadConfig();
        const dir = scope ? `${config.ledger}/${scope}` : config.ledger;
        const fileName = dir + "/lastHash.txt";
        try {
            fs.writeFileSync(fileName, hash);
        } catch (err) {
            console.error(err);
        }
    },

    /**
     * Retrieves the tip of the ledger
     * @param {string} scope - Ledger scope to retrieve the tip for
     * @returns {string} - "current_hash" of the last record
     */
    async getTip(scope) {
        const config = loadConfig();
        const dir = scope ? `${config.ledger}/${scope}` : config.ledger;
        const fileName = dir + "/lastHash.txt";
        if (fs.existsSync(fileName)) {
            const lastHash = fs.readFileSync(fileName, "utf8");
            return lastHash;
        } else {
            throw new Error("Scope not found");
        }
    },

    /**
     * Retrieves a key from the disk
     * @param {string} keyType - Type of key to retrieve ("master","usher")
     * @param {bool} privateKey - Is this a private key?
     * @returns
     */
    async getKeyFromFile(keyType, privateKey = false) {
        const config = loadConfig();
        if (privateKey)
            if (!fs.existsSync(`${config.secrets}/${keyType}.enc.json`))
                throw new Error("Key not found");
            else
                return JSON.parse(
                    fs.readFileSync(`${config.secrets}/${keyType}.enc.json`)
                );
        else if (!fs.existsSync(`${config.secrets}/${keyType}.pub.json`))
            throw new Error("Key not found");
        else
            return JSON.parse(
                fs.readFileSync(`${config.secrets}/${keyType}.pub.json`)
            );
    },
};
