import { loadConfig } from "./configService.js";
import fs from "fs";
import grpc from "@grpc/grpc-js";
import sodium from "libsodium-wrappers-sumo";

export const RootBootstrap = {
    async start(UsherService) {
        // setup
        const prefix = `[${chalk.white.bold("ROOT")}]`;
        const config = loadConfig();
        if (config.verbose)
            console.log(`${prefix}: Starting ROOT bootstrapping...`);

        if (!fs.existsSync("bootstrap.json"))
            throw new Error("Cannot find bootstrap.json");
        const bootstrap = JSON.parse(fs.readFileSync("bootstrap.json"));
        if (!bootstrap.core) throw new Error("No core in bootstrap file");

        // contacting the core
        if (config.verbose)
            console.log(
                `${prefix}: Contacting CORE (${bootstrap.core.ip}:${bootstrap.core.port})...`
            );
        const client = new UsherService(
            `${bootstrap.core.ip}:${bootstrap.core.port}`,
            grpc.credentials.createInsecure()
        );

        const stream = client.send((err, res) => {
            if (err) {
                console.error(`${prefix}: Error in send: ${err}`);
                return;
            }
            if (config.verbose)
                console.log(`${prefix}: Received from CORE: ${res}`);
        });

        stream.write();
    },

    getSigningKey(path) {
        if (!fs.existsSync(`${path}/signing.enc.json`))
            throw new Error("Signing keyfile not found");
        const keyFile = JSON.parse(fs.readFileSync(`${path}/signing.enc.json`));
    },
};
