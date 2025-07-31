import { fileURLToPath } from "url";
import fs from "fs";
import path from "path";
import { hex2base32 } from "../../tools/base32.js";
import { loadConfig } from "../../tools/v4/config.js";

let secretsPath = "";
let ledgerPath = "";

export const Disk = {
    /**
     * Lists all the key files in the secret folder
     * @returns {object} An object of privKeys, pubKeys, and hotKeys
     */
    async listKeys() {
        const files = fs.readdirSync(secretsPath);
        const privKeys = [];
        const pubKeys = [];
        const hotKeys = [];
        for (const file of files) {
            if (file.endsWith(".enc.json")) {
                privKeys.push(file);
            } else if (file.endsWith(".pub.json")) {
                pubKeys.push(file);
            } else if (file.endsWith(".hot.json")) {
                hotKeys.push(file);
            }
        }
        return { privKeys, pubKeys, hotKeys };
    },

    /**
     * Loads a key file from disk. Does not decrypt.
     * @param {string} keyName - Name of the key to load (`master`,`keymaster`,etc)
     * @param {string} keyType - `Type` of the key (`hot`,`pub`,`enc`)
     * @returns {object} Varies based on key type
     */
    async loadKey(keyName, keyType) {
        const config = loadConfig();
        const file = keyName + "." + keyType + ".json";
        const workingPath = path.join(secretsPath, file);
        console.log("Loading key from " + workingPath);
        if (!fs.existsSync(workingPath)) throw new Error("Key not found");
        return JSON.parse(fs.readFileSync(workingPath));
    },

    /**
     * Saves a key to disk. does not encrypt
     * @param {string} keyName - Name of the key to save (`master`, `keymaster`, etc)
     * @param {string} keyType - `Type` of the key (`hot`,`pub`,`enc`)
     * @param {object} key - Object containg either { key: "102..."} or the stuff for an encrypted key
     */
    async saveKey(keyName, keyType, key) {
        const file = keyName + "." + keyType + ".json";
        const filePath = path.join(secretsPath, file);
        fs.writeFileSync(filePath, JSON.stringify(key));
    },

    /**
     * Loads a record from disk
     * @param {string} scope - The desired scope
     * @param {string} hash - The base64 hash of the "previous_hash" field.
     * @returns {object} Contents of the file JSON parsed
     */
    async loadRecord(scope, hash) {
        let file;
        if (hash === "genesis") file = "genesis.json";
        else
            file =
                hex2base32(
                    Buffer.from(hash, "base64").toString("hex")
                ).toLowerCase() + ".json";
        const workingPath = path.join(ledgerPath, scope, file);
        if (!fs.existsSync(workingPath)) throw new Error("Record not found");
        return JSON.parse(fs.readFileSync(workingPath));
    },

    /**
     * Saves a record to disk
     * @param {object} record - Complete record object
     */
    async saveRecord(record) {
        const scope = record.scope;
        let hash = "genesis";
        if (record.previous_hash && record.previous_hash !== "genesis") {
            hash = hex2base32(
                Buffer.from(record.previous_hash, "base64").toString("hex")
            ).toLowerCase();
        }

        const workingPath = path.join(ledgerPath, scope, hash + ".json");
        fs.writeFileSync(workingPath, JSON.stringify(record));
        this.updateTip(record.scope, record.current_hash);
    },

    /**
     * Loads an entire scope from the disk
     * @param {string} scope - The scope to load
     * @returns
     */
    async loadScope(scope, hash = "genesis") {
        const scopeData = [];
        const file = path.join(
            ledgerPath,
            scope,
            hash === "genesis" ? "genesis.json" : hash + ".json"
        );
        if (!fs.existsSync(file))
            throw new Error("File doesn't exist: " + file);
        let genesis;
        try {
            genesis = JSON.parse(fs.readFileSync(file));
        } catch (err) {
            console.log(err.message);
        }
        scopeData.push(genesis);
        let workingHash = genesis.current_hash;
        while (true) {
            const targetFile = path.join(
                ledgerPath,
                scope,
                hex2base32(
                    Buffer.from(workingHash, "base64").toString("hex")
                ).toLowerCase() + ".json"
            );
            if (!fs.existsSync(targetFile)) {
                return scopeData;
            }
            const currentRhex = JSON.parse(fs.readFileSync(targetFile));
            workingHash = currentRhex.current_hash;
            scopeData.push(currentRhex);
        }
    },

    async getScopes() {
        const dirs = fs.readdirSync(ledgerPath);
        for (const dir of dirs) {
            console.log(dir);
        }
    },

    /**
     * Sets the paths for secrets and ledger directories
     * @param {string} secrets - Secorets path
     * @param {string} ledger - Ledger path
     */
    setPaths(secrets, ledger) {
        secretsPath = fileURLToPath(secrets);
        ledgerPath = fileURLToPath(ledger);
    },

    /**
     * Gets the paths for secrets and ledger directories
     * @returns {object} Paths of the secret and ledger directories
     */
    getPaths() {
        return {
            secrets: secretsPath,
            ledger: ledgerPath,
        };
    },

    async getTip(scope = "") {
        const workingPath = path.join(ledgerPath, scope, "lasthash.txt");
        if (!fs.existsSync(workingPath)) return "";
        else return fs.readFileSync(workingPath, "utf8");
    },

    async updateTip(scope, hash) {
        const workingPath = path.join(ledgerPath, scope, "lasthash.txt");
        fs.writeFileSync(workingPath, hash);
    },
};
