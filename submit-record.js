import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import fs from "fs";
import path from "path";
import { Command } from "commander";
import { Disk } from "./services/v3/diskService.js";
import { GrpcProtocol } from "./services/v3/grpcProtocolService.js";
import { loadConfig } from "./tools/v3/config.js";

const program = new Command();
program
    .name("submit-record")
    .description("Submit a record to the ledger")
    .version("0.0.1")
    .option("-c, --config <config_file>", "Configuration file", "./config.json")
    .option("-p, --payload <file>", "Path to payload file", "./record.json")
    .requiredOption("-s, --scope <scope>", "Scope to access")
    .option("-t, --target <target>", "gRPC target", "localhost:1984")
    .option("-v, --verbose");

program.parse(process.argv);
const options = program.opts();

loadConfig(options.config, options);

// --- Config
const PROTO_PATH = path.resolve("./proto/usher.proto");
const TARGET = options.target;
const PAYLOAD_PATH = options.payload;

// --- Load and parse proto
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});
const proto = grpc.loadPackageDefinition(packageDefinition).usher;

// --- Load payload file
if (!fs.existsSync(PAYLOAD_PATH)) {
    console.error("Payload file not found:", PAYLOAD_PATH);
    process.exit(1);
}
const payload = fs.readFileSync(PAYLOAD_PATH, "utf-8");

// --- Build request
const fingerprint = await Disk.getKeyFromFile("usher");
const request = {
    type: "record",
    scope: options.scope,
    payload,
    nonce: Date.now().toString(),
    fingerprint,
};
const signedRequest = {
    ...(await GrpcProtocol.sign(request)),
};

// --- gRPC client call
console.log("Calling server: " + TARGET);
const client = new proto.UsherSync(TARGET, grpc.credentials.createInsecure());
const call = client.send((err, response) => {
    if (err) {
        console.error("gRPC error:", err);
    } else {
        console.log("Server responded:");
        console.dir(response, { depth: null });
    }
});

call.write(signedRequest);
call.end();
