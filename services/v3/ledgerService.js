import { createDb } from "../../tools/db.js";
import { loadConfig } from "../../tools/v4/config.js";
import { Disk } from "./diskService.js";
import { LedgerProtocol } from "./ledgerProtocolService.js";
import { Record } from "./recordService.js";
import fs from "fs";

const recordTable = "records";

export const Ledger = {
    async append(record) {
        const config = loadConfig();
        if (config.verbose) {
            console.log("Appending record...");
            console.dir(record, { depth: null });
        }
        const validated = LedgerProtocol.validateRecord(record);
        if (validated) {
            await Disk.saveRecord(record.scope, record);
            await Disk.updateTip(record.scope, record.previous_hash);
            const db = createDb();
            await db(recordTable).insert(record);
            if (config.verbose) {
                console.log("Record appended successfully.");
            }
            await Record.processRecord(record);
            return record;
        } else {
            return null;
        }
    },

    async read(scope, hash) {
        const config = loadConfig();
        try {
            if (config.verbose) {
                console.log("Reading record...");
            }
            const record = await Disk.loadRecord(scope, hash);
            if (config.verbose) {
                console.dir(record, { depth: null });
            }
            return record;
        } catch (err) {
            console.error(err);
            return null;
        }
    },

    async flush() {
        const db = createDb();
        await db(recordTable).delete();
        if (fs.existsSync("lockfile.txt")) fs.unlinkSync("lockfile.txt");
    },
};
