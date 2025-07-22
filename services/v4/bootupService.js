import fs from "fs";

import { loadConfig } from "../../tools/v4/config.js";
import { Cache } from "./cacheService.js";
import { Disk } from "./diskService.js";
import { Time } from "./timeService.js";
import path from "path";
import { fileURLToPath } from "url";
import { Ledger } from "./ledgerService.js";

export const Bootup = {
    async start() {
        const config = loadConfig();
        const dir = fileURLToPath(new URL(config.ledger), import.meta.url);

        // Flush caches
        if (config.verbose) console.log("Flushing caches...");
        await Cache.flushKeys();
        await Cache.flushRecords();

        // Set epoch
        if (config.verbose) console.log("Setting epoch...");
        if (!fs.existsSync(path.join(dir, "genesis.json"))) {
            console.error(
                "Cannot find genesis R⬢ at " + path.join(dir, "genesis.json")
            );
            process.exit(1);
        }
        const genesis = await Disk.loadRecord("", "genesis");
        Time.setEpoch(genesis.data.js_at);
        console.log(
            "Current Time: " + Time.gtToString(Time.unixMsToGT(Date.now()))
        );

        // Verify root scope
        if (config.verbose) console.log("Verifying root scope...");
        const scope = await Ledger.verifyScope("");
        if (!scope) {
            console.error("Root scope not found!");
            process.exit(1);
        }
        console.log("Root scope verified!");
    },
};
