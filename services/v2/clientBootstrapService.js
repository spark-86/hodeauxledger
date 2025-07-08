import fs from "fs";
import { loadConfig } from "./configService.js";
import grpc from "@grpc/grpc-js";
import canonicalize from "canonicalize";

export const ClientBootstrap = {
    async start(UsherService) {
        const config = loadConfig();
        // Load the bootstrap file
        if (!fs.existsSync("bootstrap.json"))
            throw new Error("Bootstrap file not found");
        const bootstrap = JSON.parse(fs.readFileSync("bootstrap.json", "utf8"));

        // attempt to see if the core is online
        const client = new UsherService(
            `localhost:${config.port}`,
            grpc.credentials.createInsecure()
        );

        const stream = client.send((err, response) => {
            if (err) {
                console.error("Error in Send:", err);
                return;
            }
            console.log("Received from server:", response);
        });

        // Write a SignedRequest to the stream
        stream.write({
            type: "request",
            scope: "",
            payload: canonicalize({
                previous_hash: "TJNoFoF63K3mXpJKNzVbD+zp6kZJ3DdwFhdENNUG3F0=",
                protocol: "v1",
                scope: "",
                nonce: "yWnf8kvB4Oi9GXHyh3tsBeVmhLmY5a-Yo1LFc9rqKzA",
                at: 1751922231005,
                fingerprint: "QPH2eqvfpNAcfsIOOYmtqhQJsil2fL-IizcDei5WJ1w",
                record_type: "root:add",
                data: {
                    name: "VeroSelf Root Trust",
                    key: "aiWnU8bF8mNqXqr_2MpuLZnIHAlviWhX75WV6d1J0hs",
                },
            }),
            nonce: "9q0p8e9ouqweoij",
            signature: "test",
            public_key: "test",
        });

        // If done sending:
        stream.end();
    },
};
