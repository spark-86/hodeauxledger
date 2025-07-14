import chalk from "chalk";
import { loadConfig } from "../../tools/v3/config.js";
import fs from "fs";
import path from "path";
import { GrpcProtocol } from "./grpcProtocolService.js";
import { Disk } from "./diskService.js";
import { RecordTypeKey } from "./recordTypeKeyService.js";
import { RecordTypePolicy } from "./recordTypePolicyService.js";
import { fileURLToPath } from "url";

let masterPublicKey = null;
let usherPrivateKey = null;
let keymasterPrivateKey = null;

export const CoreStartup = {
    async start() {
        const config = loadConfig();
        console.log("Core startup sequence initiated.");

        if (config.verbose) console.log("Checking keys");
        checkKeys();
        if (config.verbose) console.log("Keys are good");

        if (config.verbose) console.log("Loading root scope...");
        const scopeData = await Disk.loadScopeFromDisk("", true, "genesis");
        for (const data of scopeData) {
            await startupHandler(data);
        }
        if (config.verbose) console.log("Pinging roots...");
        pingRoots();

        console.log("Core startup sequence complete.");
    },
};

const checkKeys = () => {
    const config = loadConfig();
    const __dirname = fileURLToPath(new URL(config.secrets, import.meta.url));
    const hotKeyPath = path.join(__dirname, "master.hot.json");
    const usherKeyPath = path.join(__dirname, "usher.hot.json");
    const keymasterKeyPath = path.join(__dirname, "keymaster.hot.json");
    console.log("keyfiles: ", hotKeyPath, usherKeyPath, keymasterKeyPath);
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
    if (!fs.existsSync(keymasterKeyPath)) {
        console.error("*** KEYMASTER KEY NOT FOUND! ***");
        console.log(
            chalk.red.bold("ERROR!") +
                " Sooooo yeah. The key that grants other keys? Gone. This is where you stare into the void for a bit."
        );
    }
    masterPublicKey = fs.readFileSync(
        path.join(__dirname, "master.pub.json")
    ).key;
    usherPrivateKey = JSON.parse(
        fs.readFileSync(path.join(__dirname, "usher.hot.json"))
    ).key;
    keymasterPrivateKey = fs.readFileSync(
        path.join(__dirname, "keymaster.hot.json")
    ).key;
};

const pingRoots = async () => {
    const message = await GrpcProtocol.composeMessage("ping", {
        scope: "",
        data: {
            schema: "ping",
        },
    });
};

const startupHandler = async (record) => {
    // We're just kinda parsing the root scope, so no need to go all out on records here
    switch (record.record_type) {
        case "key:grant":
            await RecordTypeKey.grant(record);
            break;
        case "key:revoke":
            await RecordTypeKey.revoke(record);
            break;
        case "policy:set":
            await RecordTypePolicy.set(record);
    }
};
