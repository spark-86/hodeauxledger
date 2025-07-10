import { loadConfig } from "../../tools/v3/config.js";
import path from "path";
import fs from "fs";
import chalk from "chalk";

export const StandardStartup = {
    async start() {
        const config = loadConfig();

        console.log("Standard startup sequence initiated.");

        if (config.verbose) console.log("Checking keys");
        checkKeys();

        console.log("Standard startup sequence complete.");
    },
};

const checkKeys = () => {
    const config = loadConfig();
    const __dirname = new URL(config.secrets, import.meta.url).pathname;
    const hotKeyPath = path.join(__dirname, "master.hot.json");
    const usherKeyPath = path.join(__dirname, "usher.hot.json");
    if (fs.existsSync(hotKeyPath)) {
        console.error("*** MASTER KEY IS HOT ON STARTUP! ***");
        console.log(
            chalk.red.bold("ERROR!") +
                " This is a HUGE security issue. Either remove the hot master key or run genesis again."
        );
        process.exit(69);
    }
    if (!fs.existsSync(usherKeyPath)) {
        console.error("*** USHER KEY NOT FOUND! ***");
        console.log(
            chalk.red.bold("ERROR!") +
                " This key is needed to sign basic protocal packets, and no communcation to the ledger will be respected.\nPlease see the documentation on how to correct this."
        );
        process.exit(69);
    }
};
