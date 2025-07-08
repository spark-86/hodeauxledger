import { Record } from "./recordService.js";
import canonicalize from "canonicalize";
import sodium from "libsodium-wrappers-sumo";
import { RecordProtocol } from "./recordProtocolService.js";
import { Key } from "./keyService.js";
import { Ledger } from "./ledgerService.js";
import { loadConfig } from "./configService.js";

export const UsherProcessor = {
    async processIncoming(jsonPayload) {
        const config = loadConfig();

        let response = {
            type: "error",
            scope: "",
            payload: {},
        };
        let data;
        if (typeof data === "string") data = JSON.parse(jsonPayload);
        else data = jsonPayload;
        const parsedData = JSON.parse(data.payload);
        data.payload = {
            ...parsedData,
        };
        if (config.verbose) console.dir(data, { depth: null });
        if (config.verbose) console.log("Checking if already hashed.");
        if (data.current_hash)
            return {
                ...response,
                payload: {
                    code: 310,
                    message: "Record has already been hashed.",
                },
            };
        if (data.payload.protocol === "v1") {
            if (config.verbose) console.log("Checking data size...");

            if (canonicalize(data.payload).length > 1024)
                return {
                    ...response,
                    payload: {
                        code: 330,
                        message: "Data too large",
                    },
                };

            if (config.verbose) console.log("Verifying record...");
            const verified = await Record.verify(
                data.payload,
                data.fingerprint
            );
            if (!verified) return false;

            // Is this an usher control record?
            if (data.record_type.startsWith("usher:")) {
                return "Uhhhh.... haven't come up with this schema yet";
            } else {
                // we've verified it, but is it valid for the
                // protocol version?
                if (config.verbose) console.log("Verifying the structure...");
                const validated = RecordProtocol.validateRecord(data);
                if (!validated)
                    return {
                        ...response,
                        payload: {
                            code: 301,
                            message: "Does not fit protocol definition",
                            expected: ["v1"],
                            received: data.protocol,
                        },
                    };

                // TODO: check access to see if we can even accept this
                // this type

                const newData = {
                    ...data,
                    at: Date.now(),
                };

                // Sign the record
                if (config.verbose) console.log("Signing record via Usher");
                const privateKey = await Key.privateKeyFromDisk(
                    config.secrets,
                    "usherSigning"
                );
                const signature = await this.usherSign(newData, privateKey);

                const hashed = await Record.calcCurrentHash(
                    canonicalize({
                        ...newData,
                        received_by: await Key.getPublicFromPrivate(privateKey),
                        received_signature: signature,
                    })
                );

                if (config.verbose) console.log("Appending to ledger...");
                await Ledger.append(hashed);
                return "It worked?!";
            }
        }
    },

    async composeMessage(data, privateKey) {
        await sodium.ready;
        const messageToWrite = {
            type: data.type,
            scope: data.scope,
            payload: data.payload,
            nonce: sodium.to_base64(sodium.randombytes_buf(32)),
            public_key: await Key.getPublicFromPrivate(privateKey),
        };

        const signedMessage = {
            ...messageToWrite,
            signature: sodium.to_base64(await this.signMessage(messageToWrite)),
        };

        return signedMessage;
    },

    async signMessage(message, privateKey) {
        await sodium.ready;

        const messageBytes = sodium.from_string(canonicalize(message));
        const signature = sodium.crypto_sign_detached(
            messageBytes,
            sodium.from_base64(privateKey)
        );

        return signature;
    },

    async usherSign(data, privateKey) {
        await sodium.ready;
        const messageBytes = sodium.from_string(canonicalize(data));
        const signature = sodium.crypto_sign_detached(messageBytes, privateKey);
        return signature;
    },
};
