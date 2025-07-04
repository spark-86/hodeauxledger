import canonicalize from "canonicalize";
import crypto from "crypto";
import { Record } from "../../services/v1/recordService.js";

export const postAppend = async (req, res) => {
    const {
        protocol,
        scope,
        data,
        signature,
        key,
        record_type,
        previous_hash,
    } = req.body;

    const recordToVerify = {
        previous_hash,
        protocol,
        scope,
        key,
        record_type,
        data,
    };

    // lookup key
    const found = await Keyring.ringLookup(key);
    if (!found) {
        return res.status(404).json({ error: "Key not found" });
    }

    // verify record
    const canonical = canonicalize(recordToVerify);
    const signatureBuf = Buffer.from(signature, "base64");

    const verify = crypto.createVerify("sha256");
    verify.update(canonical);
    verify.end();

    const verified = verify.verify(found.key, signatureBuf);
    if (!verified) {
        return res.status(401).json({ error: "Signature verification failed" });
    }

    // create record
    const recordToCreate = {
        previous_hash,
        protocol,
        scope,
        key,
        record_type,
        data,
        signature,
    };

    const recordId = await Record.create(recordToCreate);

    return res.status(200).json({ data: recordId });
};
