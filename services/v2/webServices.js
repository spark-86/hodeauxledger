import fs from "fs";
import { UsherProcessor } from "./usherProcessorService.js";
import sodium from "libsodium-wrappers-sumo";
import { Key } from "./keyService.js";
import { loadConfig } from "./configService.js";

export const webAppend = async (req, res) => {
    const config = loadConfig();
    const singingKey = await Key.privateKeyFromDisk(config.secrets, "usher");
    const fingerprint = await Key.getPublicFromPrivate(singingKey);
    const newPayload = {
        ...req.body,
        at: Date.now(),
        received_by: fingerprint,
    };
    const wrappedRecord = {
        type: "request",
        scope: req.params.scope ? req.params.scope : "",
        payload: {
            ...newPayload,
            received_signature: sodium.to_base64(
                await UsherProcessor.signMessage(
                    newPayload,
                    await Key.privateKeyFromDisk(config.secrets, "usher")
                )
            ),
        },
        nonce: sodium.to_base64(sodium.randombytes_buf(32)),
        at: Date.now(),
        fingerprint: await Key.getPublicFromPrivate(
            await Key.privateKeyFromDisk(config.secrets, "usher")
        ),
    };
    return await UsherProcessor.processIncoming(wrappedRecord);
};

export const webRead = async (req, res) => {};

export const webTip = async (req, res) => {
    const { scope } = req.params;

    const dir = scope ? `/ledger/${scope}` : "/ledger";
    const filePath = `${dir}/lastHash.txt`;

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "Scope not found" });
    }
    res.status(200).json({
        hash: fs.readFileSync(filePath, "utf8"),
    });
    console.log(req.ip);
};
