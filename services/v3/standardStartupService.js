import { loadConfig } from "../../tools/v4/config.js";
import path from "path";
import fs from "fs";
import chalk from "chalk";
import { fileURLToPath } from "url";
import { Keyring } from "./keyringService.js";
import { Disk } from "./diskService.js";
import { Cache } from "./cacheService.js";

export const StandardStartup = {
    async start() {
        const config = loadConfig();

        console.log("Standard startup sequence initiated.");

        if (config.verbose) console.log("Checking keys");
        checkKeys();

        await Keyring.getMyKeys();
        const ledgerScopes = getDirectoryList();
        ledgerScopes.push("");
        for (const scope of ledgerScopes) {
            if (config.verbose) console.log(`Loading ledger scope: ${scope}`);
            const scopeData = await Disk.loadScopeFromDisk(
                scope,
                true,
                "genesis"
            );
            for (const data of scopeData) {
                await Cache.storeRecordInCache(data);
            }
        }

        console.log("Standard startup sequence complete.");
    },
};

const checkKeys = () => {
    const config = loadConfig();
    const secretsPath = fileURLToPath(new URL(config.secrets, import.meta.url));
    const hotKeyPath = path.join(secretsPath, "master.hot.json");
    const usherKeyPath = path.join(secretsPath, "usher.hot.json");
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
                " This key is needed to sign basic protocal packets, and no communcation to the ledger will be respected.\nPlease see the documentation on how to correct this." +
                usherKeyPath
        );
        process.exit(69);
    }
};

const getDirectoryList = () => {
    const config = loadConfig();
    const ledgerPath = fileURLToPath(new URL(config.ledger, import.meta.url));
    if (!fs.existsSync(ledgerPath)) {
        console.error("Ledger directory does not exist:", ledgerPath);
        return [];
    }
    return fs.readdirSync(ledgerPath).filter((file) => {
        const filePath = path.join(ledgerPath, file);
        return fs.statSync(filePath).isDirectory();
    });
};
