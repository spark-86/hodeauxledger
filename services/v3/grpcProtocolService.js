import { loadConfig } from "../tools/v3/config.js";
import sodium from "libsodium-wrappers-sumo";
import { Disk } from "./diskService.js";

export const GrpcProtocol = {
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

        return record;
    },

    async sendMessage(message) {
        const config = loadConfig();
    },

    async receiveMessage(message) {
        const config = loadConfig();
        if (config.verbose) {
            console.log("Received message:");
            console.dir(message, { depth: null });
        }
        return message;
    },

    async sign(message) {
        const config = loadConfig();
        if (config.verbose) {
            console.log("Signing message...");
            console.dir(message, { depth: null });
        }
        const privateKey = Disk.getKeyFromFile("usher", true).key;

        return message;
    },
};
