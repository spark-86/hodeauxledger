import { loadConfig } from "./configService.js";
import { Key } from "./keyService.js";
import sodium from "libsodium-wrappers-sumo";
import fs from "fs";
import { Ledger } from "./ledgerService.js";
import chalk from "chalk";

export const CoreBootstrap = {
    async start() {
        // setup
        await sodium.ready;
        const config = loadConfig();
        const prefix = `[${chalk.yellow.bold("CORE")}]:`;
        console.log(`${prefix} Bootstrapping the CORE (insert dramatic music)`);

        // First, we have to make sure we don't need to run genesis first
        if (!fs.existsSync(config.ledger + "/genesis.json"))
            throw new Error("No genesis found. Re-run genesis.");

        Ledger.buildFromDisk(config.ledger);
    },
};
