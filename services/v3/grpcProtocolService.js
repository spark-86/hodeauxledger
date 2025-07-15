import { loadConfig } from "../../tools/v3/config.js";
import sodium from "libsodium-wrappers-sumo";
import { Disk } from "./diskService.js";
import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";

let clientCache = {};

export const GrpcProtocol = {
    setClient(address) {
        if (clientCache[address]) return clientCache[address];

        const packageDef = protoLoader.loadSync("./proto/usher.proto", {});
        const proto = grpc.loadPackageDefinition(packageDef);
        const client = new proto.usher.UsherSync(
            address,
            grpc.credentials.createInsecure()
        );
        clientCache[address] = client;
        return client;
    },

    async composeMessage(messageType, record) {
        const config = loadConfig();
        if (config.verbose) {
            console.log("Composing message...");
            console.dir(record, { depth: null });
        }
        const message = {
            type: messageType,
            scope: record.scope,
            payload: record,
            nonce: sodium.to_base64(sodium.randombytes_buf(32)),
            public_key: Disk.getKeyFromFile("usher", false).key,
        };

        if (config.verbose) {
            console.log("Message composed:");
            console.dir(message, { depth: null });
        }

        return message;
    },

    async sendMessage(message) {
        const config = loadConfig();
        if (config.verbose) {
            console.log("Sending message...");
            console.dir(message, { depth: null });
        }

        const client = this.setClient("localhost:1984");
        if (!client) throw new Error("gRPC client not initialized");

        return new Promise((resolve, reject) => {
            const call = client.send((err, response) => {
                if (err) {
                    console.error("gRPC send error:", err);
                    return reject(err);
                }
                if (config.verbose) {
                    console.log("Send response:");
                    console.dir(response, { depth: null });
                }
                resolve(response);
            });

            call.write(message);
            call.end();
        });
    },

    async receiveMessage(message) {
        await sodium.ready;
        const config = loadConfig();

        if (config.verbose) {
            console.log("Received message:");
            console.dir(message, { depth: null });
        }
        // Pre-build our response to the default error.
        const response = {
            type: "error",
            scope: message.scope,
            payload: {},
            nonce: sodium.to_base64(sodium.randombytes_buf(32)),
            fingerprint: await Disk.getKeyFromFile("usher").key,
        };

        const messageToVerify = {
            ...message,
        };
        delete messageToVerify.signature;
        if (
            !(await this.verify(
                messageToVerify,
                messageToVerify.fingerprint,
                message.signature
            ))
        ) {
            return this.sign({
                ...response,
                payload: {
                    code: 400,
                    message:
                        "Message packet failed verfication, please retry your request",
                },
            });
        }
        switch (message.type) {
            case "append":
                return await this.sign({
                    ...response,
                    ...(await this.handleAppend(message)),
                });
            case "read":
                break;
            case "ack":
        }

        return response;
    },

    async sign(message) {
        await sodium.ready;
        const config = loadConfig();
        if (config.verbose) {
            console.log("Signing message...");
            console.dir(message, { depth: null });
        }
        const privateKey = await Disk.getKeyFromFile("usher", true).key;
        console.log(privateKey);
        const messageBytes = sodium.from_string(JSON.stringify(message));
        const signature = sodium.crypto_sign_detached(
            messageBytes,
            sodium.from_base64(privateKey)
        );
        message.signature = sodium.to_base64(signature);

        return message;
    },

    async verify(message, pubKey, signature) {
        await sodium.ready;
        const config = loadConfig();
        if (config.verbose) {
            console.log("Verifying message...");
            console.dir(message, { depth: null });
        }

        const messageBytes = sodium.from_string(JSON.stringify(message));
        const signatureBytes = sodium.from_base64(signature);
        const publicKeyBytes = sodium.from_base64(pubKey);

        const isValid = sodium.crypto_sign_verify_detached(
            signatureBytes,
            messageBytes,
            publicKeyBytes
        );

        if (!isValid) throw new Error("Signature verification failed");

        return true;
    },

    async handleAppend(message) {
        // FUCK MY BRAIN IS TIRED
        //
        // I guess we do it here. I don't really like this.

        // 1) Make sure everything is verified
        const verified = await this.verify(
            {
                type: message.type,
                scope: message.scope,
                payload: message.payload,
                nonce: message.nonce,
            },
            message.fingerprint,
            message.signature
        );
        if (!verified) throw new Error("Message packet failed verfication");

        // 2) Verify
    },
};
