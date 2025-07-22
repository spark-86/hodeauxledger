import express from "express";
import { Command } from "commander";
import { loadConfig } from "./tools/v4/config.js";
import { postAppend } from "./controllers/v1/appendController.js";
import cors from "cors";
import { Disk } from "./services/v4/diskService.js";
import { Cache } from "./services/v4/cacheService.js";
import chalk from "chalk";
import { Time } from "./services/v4/timeService.js";

const program = new Command();

program
    .name("usher-express")
    .description("REST version of the usher")
    .option("-g, --genesis", "Run Genesis")
    .option(
        "-c, --config <configfile>",
        "Set config file (default: ./config.json)",
        "./config.json"
    )
    .option("--core", "Run as the core")
    .option("-v, --verbose", "Verbose logging");

program.parse(process.argv);

const options = program.opts();
console.log(options);
const config = loadConfig(options.config, options);
Disk.setPaths(config.secrets, config.ledger);

console.log(chalk.magentaBright("Loading root scope from disk..."));
const rootScope = await Disk.loadScope("");
for (const node of rootScope) {
    console.log(
        chalk.blackBright(
            `Loaded node: ${node.record_type} with hash: ${node.current_hash}`
        )
    );
}

// set Genesis Epoch
if (rootScope[0].data.js_at) {
    Time.setEpoch(rootScope[0].data.js_at);
    console.log(
        "Setting current time to " +
            chalk.magentaBright(Time.gtToString(Time.unixMsToGT(Date.now())))
    );
} else
    console.error(
        chalk.redBright("Warning") +
            ": Could not get genesis time from root scope. Falling back to known constant."
    );

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.post("/append", postAppend);

app.listen(1978, () => {
    console.log("Usher Express listening on port 1978");
});
