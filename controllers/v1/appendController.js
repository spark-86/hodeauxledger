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
