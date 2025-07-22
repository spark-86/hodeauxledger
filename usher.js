import { Command } from "commander";
import { loadConfig } from "./tools/v4/config.js";
import { Bootup } from "./services/v4/bootupService.js";
import { Genesis } from "./services/v4/genesisService.js";
import { Disk } from "./services/v4/diskService.js";

import appendRoutes from "./routes/v1/appendRoutes.js";

import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import chalk from "chalk";
import express from "express";
import { Network } from "./services/v4/networkService.js";

const program = new Command();

program
    .name("usher")
    .description("Transport for the HodeauxLedger")
    .version("0.0.5")
    .option("-v, --verbose", "Additional logging")
    .option("-g, --genesis", "Start the genesis process")
    .option(
        "-c, --config <configFile>",
        "Load config from specified file (default: config.json)",
        "config.json"
    )
    .option(
        "-p, --port <portNumber>",
        "Port number to use for gRPC comms (default: 1984)",
        1984
    )
    .option(
        "--http-port <portNumber>",
        "Port number for local admin panel (default: 1978)",
        1978
    );

program.parse(process.argv);
const options = program.opts();
const overrides = {};
if (options.verbose) overrides.verbose = true;
if (options.genesis) overrides.genesis = true;
if (options.port) overrides.port = options.port;
if (options.httpPort) overrides.httpPort = options.httpPort;
const config = loadConfig(options.config, overrides);

Disk.setPaths(config.secrets, config.ledger);

if (config.genesis) {
    await Genesis.start();
    process.exit(0);
}

console.log(chalk.greenBright("Starting bootup..."));
await Bootup.start();
console.log(chalk.greenBright("Bootup complete!"));
console.log(chalk.greenBright("Starting gRPC server..."));

// gRPC shit. Really want to move this to another file
const packageDef = protoLoader.loadSync("./proto/usher.proto", {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});
const proto = grpc.loadPackageDefinition(packageDef).usher;
const UsherService = proto.UsherSync;

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
                    const response = Network.receiveMessage(finalRequest);
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

server.bindAsync(
    `0.0.0.0:${config.port}`,
    grpc.ServerCredentials.createInsecure(),
    (err, port) => {
        if (err) {
            console.error("Failed to start gRPC server:", err);
            process.exit(1);
        }
        console.log(chalk.greenBright(`gRPC server listening on port ${port}`));
    }
);

// express http for UX
console.log(chalk.greenBright("Starting HTTP server..."));
console.log(
    chalk.greenBright(`HTTP server listening on port ${config.httpPort}`)
);
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/append", appendRoutes);

app.use(express.static("public"));
app.get("/", (_, res) => res.sendFile("public/index.html"));

app.listen(config.httpPort);
