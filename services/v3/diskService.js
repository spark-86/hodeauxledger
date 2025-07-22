import fs from "fs";
import { loadConfig } from "../../tools/v4/config.js";
import path from "path";
import { fileURLToPath } from "url";
import { Record } from "./recordService.js";
import { hex2base32 } from "../../tools/base32.js";

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
        const safeHash =
            record.record_type !== "genesis"
                ? hex2base32(
                      Buffer.from(record.previous_hash, "base64").toString(
                          "hex"
                      )
                  )
                : "genesis";

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
        const __dirname = fileURLToPath(
            new URL(config.secrets, import.meta.url)
        );
        const __file = privateKey
            ? keyType + ".enc.json"
            : keyType + ".pub.json";
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

    async loadScopeFromDisk(scopeName, verify = true, hash = "genesis") {
        const config = loadConfig();
        const scope = [];
        const dir =
            scope.length > 0 ? `${config.ledger}/${scopeName}` : config.ledger;
        const fileName = dir + "/" + hash + ".json";

        console.log("Loading scope genesis:");

        if (!fs.existsSync(fileName))
            throw new Error("Couldn't get scope from hash: " + fileName);
        const genesis = JSON.parse(fs.readFileSync(fileName));
        if (verify) {
            const verified = await Record.verify(genesis, genesis.data.key);
            if (!verified) throw new Error("Couldn't verify genesis of scope.");
        }
        scope.push(genesis);
        let done = false;
        let lastHash = genesis.current_hash;
        while (!done) {
            const base32hash = hex2base32(
                Buffer.from(lastHash, "base64").toString("hex")
            );
            if (!fs.existsSync(`${dir}/${base32hash}.json`)) {
                done = true;
            } else {
                console.log("Processing " + base32hash);
                const workingNode = JSON.parse(
                    fs.readFileSync(`${dir}/${base32hash}.json`)
                );

                if (verify) {
                    const verified = await Record.verify(
                        workingNode,
                        workingNode.fingerprint
                    );
                    if (!verified)
                        throw new Error(
                            `Couldn't verify record #${base32hash}`
                        );
                }
                scope.push(workingNode);
                lastHash = workingNode.current_hash;
            }
        }
        return scope;
    },
};
