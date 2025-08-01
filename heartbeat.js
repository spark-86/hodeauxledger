import express from "express";
import { Command } from "commander";
import { loadConfig } from "./tools/v4/config.js";
import { Disk } from "./services/v4/diskService.js";
import { Time } from "./services/v4/timeService.js";

const program = new Command();

program
    .name("heartbeat")
    .description("Ledger Heartbeat Announcer")
    .option(
        "-c, --config <configfile>",
        "Set config file (default: ./config.json)",
        "./config.json"
    )
    .option("-v, --verbose", "Verbose logging");

program.parse(process.argv);

const options = program.opts();
const config = loadConfig(options.config, options);

console.log("Heartbeat announcer started.");
console.log("Config:", config);

const app = express();

Disk.setPaths(config.secrets, config.ledger);
const scopeData = await Disk.loadScope("");
Time.setEpoch(scopeData[0].data.js_at);

app.get("/", (req, res) => {
    console.log("Heartbeat request received from IP: " + req.ip + ":1985");
    res.json({
        message: "Heartbeat is active",
        time: Time.gtToString(Time.unixMsToGT(Date.now())),
    });
});

app.listen(1985, () => {
    console.log("Heartbeat announcer listening on port 1985");
});
