import chalk from "chalk";
import { loadConfig } from "../../tools/v3/config";
import fs from "fs";
import path from "path";

let masterPublicKey = null;
let usherPrivateKey = null;

export const CoreStartup = {
    async start() {
        const config = loadConfig();
        console.log("Core startup sequence initiated.");

        if (config.verbose) console.log("Checking keys");
        checkKeys();
        if (config.verbose) console.log("Keys are good");

        console.log("Core startup sequence complete.");
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
            chalk.red.bold("🚨 ERROR! - HARD STOP.") +
                " If you're running a core usher with a hot master key... you might wanna take a breather and reread the design docs. This is not fine. 🔥"
        );
        process.exit(666);
    }
    if (!fs.existsSync(usherKeyPath)) {
        console.error("*** USHER KEY NOT FOUND! ***");
        console.log(
            chalk.red.bold("❌ ERROR!") +
                " This key is required to sign basic protocol packets. If it's missing... well, you're probably not just having a bad day — you're having a structural failure."
        );
    }
    masterPublicKey = fs.readFileSync(
        path.join(__dirname, "master.pub.json")
    ).key;
    usherPrivateKey = JSON.parse(
        fs.readFileSync(path.join(__dirname, "usher.hot.json"))
    ).key;
};
