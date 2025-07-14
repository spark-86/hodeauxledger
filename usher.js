import { Command } from "commander";
import fs from "fs";
import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import path from "path";
import chalk from "chalk";
import { fileURLToPath } from "url";
import express from "express";

import { Genesis } from "./services/v3/genesisService.js";
import { Keyring } from "./services/v3/keyringService.js";
import { loadConfig } from "./tools/v3/config.js";
import { Ledger } from "./services/v3/ledgerService.js";
import { StandardStartup } from "./services/v3/standardStartupService.js";
import { GrpcProtocol } from "./services/v3/grpcProtocolService.js";
import { Disk } from "./services/v3/diskService.js";
import { Cache } from "./services/v3/cacheService.js";
import { CoreStartup } from "./services/v3/coreStartupService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const protoPath = path.join(__dirname, "./proto/usher.proto");

const program = new Command();

program
    .name("usher")
    .description("HodeauxLedger Usher (ledger client/server)")
    .version("0.0.1")
    .option("--core", "This is the core")
    .option("--root", "This is a root authority")
    .option(
        "-g, --genesis",
        "Run genesis. WARNING: Deletes your key if it exists"
    )
    .option(
        "-c, --config <config>",
        "Path to config (default is config.json)",
        "./config.json"
    )
    .option("-p, --port <port>", "Port for gRPC listener", "1984")
    .option("-s, --secrets <path>", "Path for secrets", "/secrets")
    .option("-l, --ledger <path>", "Path for ledger", "/ledger")
    .option("--logfile <path>", "Path for logs (default is ./logs)")
    .option("-v, --verbose", "Enable verbose logging")
    .option("--passphrase <passphrase>", "Passphrase for genesis");

program.parse(process.argv);
const options = program.opts();

// *** load config
if (options.verbose) console.log("Loading config...");
// FIXME: This doesn't work as intended, because the defaults will
// overwrite the config file
let overrides = {
    secrets: options.secrets || "./secrets",
    ledger: options.ledger || "./ledger",
    genesis: options.genesis || false,
    core: options.core || false,
    root: options.root || false,
    passphrase: options.passphrase || null,
};
if (!fs.existsSync(options.config)) {
    console.error("Config file not found: " + options.config);
}
const config = loadConfig(options.config, overrides);
console.dir(config, { depth: null });

// *** validate options
if (options.core && options.root) {
    console.error("Can't be both root and core.");
    process.exit(1);
}

// *** make sure sqlite is setup correctly.
await Cache.buildKeyringCacheTable();
await Cache.buildRecordCacheTable();

// *** flush keyring and ledger
await Keyring.flush();
await Ledger.flush();

// *** check to see if we're running Genesis
if (options.genesis) {
    await Genesis.letThereBeLight();
    process.exit(0);
}

// *** master key check
const hotKeyPath = path.join(config.secrets, "master.hot.json");
if (fs.existsSync(hotKeyPath)) {
    console.error("*** MASTER KEY IS HOT ON STARTUP! ***");
    console.log(
        chalk.red.bold("ERROR!") +
            " This is a HUGE security issue. Either remove the hot master key or run genesis again."
    );
    process.exit(69);
}

//*** set up gRPC
const packageDef = protoLoader.loadSync(protoPath, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});
const proto = grpc.loadPackageDefinition(packageDef);
const UsherService = proto.usher.UsherSync;

const buildGrpcHandlers = () => {
    return {
        send(call, callback) {
            let finalRequest;

            call.on("data", (chunk) => {
                console.log("Received chunk:", chunk);
                finalRequest = chunk; // Can accumulate here if needed
            });

            call.on("end", async () => {
                try {
                    console.dir(finalRequest, { depth: null });
                    const response = GrpcProtocol.receiveMessage(finalRequest);
                    callback(null, response);
                } catch (err) {
                    console.error("Processing error:", err);
                    callback({
                        code: grpc.status.INTERNAL,
                        message: "Internal processing error",
                    });
                }
            });

            call.on("error", (err) => {
                console.error("Stream error:", err);
            });
        },
    };
};
const server = new grpc.Server();
server.addService(UsherService.service, buildGrpcHandlers());

// *** start gRPC
const bindAddress = `0.0.0.0:${options.port}`;
server.bindAsync(
    bindAddress,
    grpc.ServerCredentials.createInsecure(),
    (err, port) => {
        if (err) {
            console.error("Failed to start gRPC server:", err);
            process.exit(1);
        }

        const app = express();
        app.use(express.json());
        app.use(express.urlencoded({ extended: true }));

        app.use(express.static(path.join(__dirname, "public")));
        app.get("/", (_, res) =>
            res.sendFile(path.join(__dirname, "public/index.html"))
        );

        app.get("/test", async (_, res) => {
            const scope = await Disk.loadScopeFromDisk("");
            console.dir(scope, { depth: null });
            return res.status(200).json({ scope });
        });
        app.listen(config.httpPort, () =>
            console.log(
                chalk.green(
                    `Usher HTTP server listening on port ${config.httpPort}`
                )
            )
        );

        console.log(chalk.green(`Usher gRPC server listening on port ${port}`));
        if (options.core) CoreStartup.start();
        if (!options.core && !options.root) StandardStartup.start();
    }
);
