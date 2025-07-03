import { configDotenv } from "dotenv";
import { Keyring } from "../../services/v1/keyringService.js";

configDotenv();

const recordTable = "records";
const APIKey = process.env.API_KEY;

export const postSystemRecord = async (req, res) => {
    if (req.headers.authorization !== APIKey) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const { record_type, data, previous_hash } = req.body;

    console.log(record_type, data, previous_hash);

    switch (record_type) {
        case "root:add":
            await Keyring.addRootAuthority(data, previous_hash);
            return res.status(200).json({ data: "ok" });
            break;
        case "issuing:add":
            await Keyring.addIssuingAuthority(data);
            break;
        default:
            return res.status(400).json({ error: "Invalid record type" });
    }
};
