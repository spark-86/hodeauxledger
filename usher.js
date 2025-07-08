import chalk from "chalk";
import { Command } from "commander";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { loadConfig } from "./services/v2/configService.js";
import { Genesis } from "./services/v2/genesisService.js";
import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import { ClientBootstrap } from "./services/v2/clientBootstrapService.js";
import { CoreBootstrap } from "./services/v2/coreBootstrapService.js";
import { Key } from "./services/v2/keyService.js";
import { Ledger } from "./services/v2/ledgerService.js";
import { UsherProcessor } from "./services/v2/usherProcessorService.js";

// Setup paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const protoPath = path.join(__dirname, "./proto/usher.proto");

// CLI
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

// Validate CLI
if (options.core && options.root) {
    console.error(chalk.red.bold("Error: Can't be both root and core."));
    process.exit(1);
}

// Build overrides
const overrides = {
    core: !!options.core,
    root: !!options.root,
    genesis: !!options.genesis,
    ...(options.port && { port: options.port }),
    ...(options.bootstrap && { bootstrapFile: options.bootstrap }),
    ...(options.secrets && { secrets: options.secrets }),
    ...(options.ledger && { ledger: options.ledger }),
    ...(options.logfile && { logfile: options.logfile }),
    ...(options.verbose && { verbose: options.verbose }),
};

// Load config
let config;
const configPath = options.config || "config.json";
if (!fs.existsSync(configPath)) {
    console.error(
        chalk.red.bold(`Error: Config file not found: ${configPath}`)
    );
    process.exit(1);
}
config = loadConfig(configPath, overrides);

// If genesis, run and exit
if (options.genesis) {
    await Genesis.letThereBeLight();
    process.exit(0);
}

// Since we aren't running genesis, check to see if the master key
// is still or has become hot
if (fs.existsSync(config.secrets + "/master.hot.json")) {
    console.error("*** MASTER KEY IS HOT ON STARTUP! ***");
    console.log(
        chalk.red.bold("ERROR!") +
            " This is a HUGE security issue. Either remove the hot master key or run genesis again."
    );
    console.log("This application will close due to security.");
    process.exit(69);
}

// gRPC setup
const packageDef = protoLoader.loadSync(protoPath, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});
const proto = grpc.loadPackageDefinition(packageDef);
const UsherService = proto.usher.UsherSync;

const server = new grpc.Server();

// Implement your RPC handlers here
server.addService(UsherService.service, {
    send(call, callback) {
        let finalRequest;

        call.on("data", (request) => {
            console.log("Received chunk:", request);
            finalRequest = request; // you can accumulate if you want
        });

        call.on("end", () => {
            (async () => {
                try {
                    const response = await UsherProcessor.processIncoming(
                        finalRequest
                    );
                    console.log(response);
                    callback(null, response);
                } catch (err) {
                    console.error("Processing error:", err);
                    callback({
                        code: grpc.status.INTERNAL,
                        message: "Internal processing error",
                    });
                }
            })();
        });

        call.on("error", (err) => {
            console.error("Stream error:", err);
        });
    },

    receive(call, callback) {
        console.log("Received receive request:", call.request);
        callback(null, { message: "Here is your data." });
    },
});

// Flush the cached db
await Key.ringFlush();
await Ledger.flush();

// Start the server
const bindAddress = `0.0.0.0:${options.port || 1978}`;
server.bindAsync(
    bindAddress,
    grpc.ServerCredentials.createInsecure(),
    (err, port) => {
        if (err) {
            console.error("Failed to start server:", err);
            process.exit(1);
        }
        console.log(chalk.green(`Usher gRPC server listening on port ${port}`));

        if (!options.root && !options.core) {
            ClientBootstrap.start(UsherService);
        }

        if (options.root) {
            RootBootstrap.start(UsherService);
        }

        if (options.core) {
            CoreBootstrap.start();
        }
    }
);
