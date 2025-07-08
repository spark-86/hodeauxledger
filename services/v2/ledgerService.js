import { createDb } from "../../tools/db.js";
import { loadConfig } from "../../services/v2/configService.js";
import fs from "fs";
import { Record } from "./recordService.js";
import { Key } from "./keyService.js";

const recordTable = "records";

export const Ledger = {
    async append(data) {
        const config = loadConfig();

        // Make sure this is a complete record
        if (!data.protocol) throw new Error("No protocol provided");
        if (data.protocol === "v1") {
            if (!data.previous_hash && data.record_type !== "genesis")
                throw new Error("No previous hash provided");
            if (!data.record_type) throw new Error("No record type provided");
            if (!data.nonce) throw new Error("Nonce not provided");
            if (!data.at) throw new Error("No at time provided");
            if (!data.fingerprint) throw new Error("No key provided");
            if (!data.signature) throw new Error("No signature provided");
            if (!data.current_hash) throw new Error("No current hash provided");
            if (!data.received_by) throw new Error("Usher didn't sign");
            if (!data.received_signature) throw new Error("Usher didn't sign");
        } else {
            throw new Error("Unknown protocol: " + data.protocol);
        }

        // Make sure we are matching hashes
        if (data.record_type !== "genesis") {
            const tip = await this.getTip(data.scope);

            if (tip) {
                if (tip !== data.previous_hash)
                    throw new Error("Previous hash mismatch");
            } else {
                throw new Error("Scope not found");
            }
        }

        // Save to disk first
        await this.writeToDisk(config.ledger, data);

        // Update the tip
        await this.updateTip(data);

        // Save to db
        const recordId = await this.addToDb(data);
        return recordId;
    },
    async read(scope, record_type = "") {},

    async load(path, hash) {
        // Load the record
        console.log("Loading record " + path + hash);
        if (!fs.existsSync(path + hash + ".json"))
            throw new Error("Record not found");
        const data = JSON.parse(fs.readFileSync(path + hash + ".json"));

        // Find the key
        const publicKey = await Key.ringFind(data.scope, data.fingerprint);
        if (!publicKey)
            throw new Error("Key not found - can not verify record");

        // Verify the record
        if (await Record.verify(data, publicKey.key)) {
            // Process the record
            await Record.processRecord(data);
            // Save to db
            await this.addToDb(data);
        } else throw new Error("Record verification failed");
        return data;
    },

    async flush() {
        const db = createDb();
        await db(recordTable).delete();
        if (fs.existsSync("lockfile.txt")) fs.unlinkSync("lockfile.txt");
    },

    async addToDb(data) {
        const db = createDb();
        await db(recordTable).insert(data);
    },

    async buildFromDisk(path) {
        // Set the core key
        const config = loadConfig();
        const coreKey = fs.readFileSync(config.secrets + "/master.pub", "utf8");
        await Key.ringAdd("", ["core"], coreKey);

        let workingPath = path;
        if (!workingPath.endsWith("/")) workingPath += "/";

        // first we rip the "" scope, in the root of /ledger
        await this.loadDir(workingPath);

        // Then we find any scopes we host/mirror
        const dirs = fs.readdirSync(workingPath, { withFileTypes: true });
        for (const dir of dirs) {
            if (dir.isDirectory()) {
                await this.loadDir(workingPath + dir.name);
            }
        }
    },

    async loadDir(path) {
        console.log("Loading directory " + path);
        let genesisRec;
        if (fs.existsSync(path + "genesis.json")) {
            genesisRec = await this.load(path, "genesis");
        } else {
            throw new Error("Genesis not found");
        }
        let done = false;
        let lastHash = Buffer.from(genesisRec.current_hash, "base64")
            .toString("hex")
            .toLowerCase();
        console.log("Last hash: " + lastHash);
        let workingRecord;
        while (!done) {
            if (!fs.existsSync(path + lastHash + ".json")) done = true;
            else {
                workingRecord = await this.load(path, lastHash);
                lastHash = Buffer.from(workingRecord.current_hash, "base64")
                    .toString("hex")
                    .toLowerCase();
            }
        }
    },

    async writeToDisk(path, data) {
        if (!data.previous_hash && data.record_type !== "genesis")
            throw new Error("No previous hash provided");
        const filename = data.previous_hash
            ? Buffer.from(data.previous_hash, "base64").toString("hex")
            : "genesis";
        fs.writeFileSync(path + "/" + filename + ".json", JSON.stringify(data));
    },

    async updateTip(data) {
        const config = loadConfig();
        fs.writeFileSync(
            config.ledger +
                "/" +
                data.scope +
                "/" +
                lastHash +
                data.scope +
                ".txt",
            data.current_hash
        );
    },

    async getTip(scope) {
        const config = loadConfig();

        if (fs.existsSync(config.ledger + "/lastHash_" + scope + ".txt")) {
            const lastHash = fs.readFileSync(
                config.ledger + "/lastHash_" + scope + ".txt",
                "utf8"
            );
            return lastHash;
        } else {
            throw new Error("Scope not found");
        }
    },
};
