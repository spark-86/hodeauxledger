import fs from "fs";
import { Log } from "../../tools/logger.js";

const ledgerPath = process.env.LEDGER_PATH || "/ledger";

export const getPreviousHash = async (req, res) => {
    const lastHash = fs.readFileSync(ledgerPath + "/lastHash.txt", "utf8");
    return res.status(200).json({ data: lastHash });
};
