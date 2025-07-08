//import { loadConfig } from "./services/v2/configService.js";
import { Command } from "commander";
import { Genesis } from "./services/v2/genesisService.js";
import { loadConfig } from "./services/v2/configService.js";
import { Ledger } from "./services/v2/ledgerService.js";
import { Key } from "./services/v2/keyService.js";

const program = new Command();
program
    .name("test")
    .description("Test command")
    .version("0.0.1")
    .option("-c, --config <config>", "Config file", "config.json")
    .option("--run-genesis", "Run genesis and exit");

program.parse(process.argv);
const options = program.opts();

if (!options.config) {
    console.error("Config file is required");
    process.exit(1);
}

const config = loadConfig(options.config);

// Flush the db cache
await Ledger.flush();
await Key.ringFlush();

if (options.runGenesis) {
    await Genesis.letThereBeLight();
    process.exit(0);
}

await Ledger.buildFromDisk(config.ledger);
