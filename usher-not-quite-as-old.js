import fs from "fs";
import path from "path";
import chalk from "chalk";
import grpc from "@grpc/grpc-js";
import express from "express";
import { Command } from "commander";
import protoLoader from "@grpc/proto-loader";
import { fileURLToPath } from "url";

import { loadConfig } from "./services/v2/configService.js";
import { Genesis } from "./services/v2/genesisService.js";
import { Key } from "./services/v2/keyService.js";
import { Ledger } from "./services/v2/ledgerService.js";
import { UsherProcessor } from "./services/v2/usherProcessorService.js";
import { ClientBootstrap } from "./services/v2/clientBootstrapService.js";
import { CoreBootstrap } from "./services/v2/coreBootstrapService.js";
import { RootBootstrap } from "./services/v2/rootBootstrapService.js";

import appendRoutes from "./routes/v1/appendRoutes.js";
import tipRoutes from "./routes/v1/tipRoutes.js";

// ─── Path Setup ───────────────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const protoPath = path.join(__dirname, "./proto/usher.proto");

// ─── CLI Setup ────────────────────────────────────────────────────────────────
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
    .option("-c, --config <config>", "Path to config (default is config.json)")
    .option("-p, --port <port>", "Port for gRPC listener", "50051")
    .option("-b, --bootstrap <file>", "Bootstrap file (used with genesis)")
    .option("-s, --secrets <path>", "Path for secrets", "/secrets")
    .option("-l, --ledger <path>", "Path for ledger", "/ledger")
    .option("--logfile <path>", "Path for logs (default is ./logs)")
    .option("-v, --verbose", "Enable verbose logging");

program.parse(process.argv);
const options = program.opts();

// ─── Validate Options ─────────────────────────────────────────────────────────
if (options.core && options.root) {
    console.error(chalk.red.bold("Error: Can't be both root and core."));
    process.exit(1);
}

// ─── Build Config Overrides ───────────────────────────────────────────────────
const overrides = {
    core: Boolean(options.core),
    root: Boolean(options.root),
    genesis: Boolean(options.genesis),
    port: options.port,
    bootstrapFile: options.bootstrap,
    secrets: options.secrets,
    ledger: options.ledger,
    logfile: options.logfile,
    verbose: options.verbose,
};

// ─── Load Config ──────────────────────────────────────────────────────────────
const configPath = options.config || "config.json";
if (!fs.existsSync(configPath)) {
    console.error(
        chalk.red.bold(`Error: Config file not found: ${configPath}`)
    );
    process.exit(1);
}
const config = loadConfig(configPath, overrides);

// ─── Genesis Handling ─────────────────────────────────────────────────────────
if (options.genesis) {
    await Genesis.letThereBeLight();
    process.exit(0);
}

// ─── Master Key Check ─────────────────────────────────────────────────────────
const hotKeyPath = path.join(config.secrets, "master.hot.json");
if (fs.existsSync(hotKeyPath)) {
    console.error("*** MASTER KEY IS HOT ON STARTUP! ***");
    console.log(
        chalk.red.bold("ERROR!") +
            " This is a HUGE security issue. Either remove the hot master key or run genesis again."
    );
    process.exit(69);
}

// ─── gRPC Setup ───────────────────────────────────────────────────────────────
const packageDef = protoLoader.loadSync(protoPath, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});
const proto = grpc.loadPackageDefinition(packageDef);
const UsherService = proto.usher.UsherSync;

function buildGrpcHandlers() {
    return {
        send(call, callback) {
            let finalRequest;

            call.on("data", (chunk) => {
                console.log("Received chunk:", chunk);
                finalRequest = chunk; // Can accumulate here if needed
            });

            call.on("end", async () => {
                try {
                    const response = await UsherProcessor.processIncoming(
                        finalRequest
                    );
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

        receive(call, callback) {
            console.log("Received receive request:", call.request);
            callback(null, { message: "Here is your data." });
        },
    };
}

const server = new grpc.Server();
server.addService(UsherService.service, buildGrpcHandlers());

// ─── Flush Keyring and Ledger ─────────────────────────────────────────────────
await Key.ringFlush();
await Ledger.flush();

// ─── Start gRPC + HTTP Servers ────────────────────────────────────────────────
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

        app.use("/append", appendRoutes);
        app.use("/tip", tipRoutes);

        app.use(express.static(path.join(__dirname, "public")));
        app.get("/", (_, res) =>
            res.sendFile(path.join(__dirname, "public/index.html"))
        );

        app.listen(config.httpPort, () =>
            console.log(
                chalk.green(
                    `Usher HTTP server listening on port ${config.httpPort}`
                )
            )
        );

        console.log(chalk.green(`Usher gRPC server listening on port ${port}`));

        if (options.core) CoreBootstrap.start();
        if (options.root) RootBootstrap.start(UsherService);
        if (!options.core && !options.root) ClientBootstrap.start(UsherService);
    }
);
