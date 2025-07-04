import fs from "fs";
import { Log } from "../../tools/logger.js";

const ledgerPath = process.env.LEDGER_PATH || "/ledger";

export const getPreviousHash = async (req, res) => {
    const { scope } = req.params;

    const workingScope = scope ? scope : "";
    if (!fs.existsSync(`${ledgerPath}/lastHash_${workingScope}.txt`))
        return res.status(404).json({ error: "No previous hash found" });

    const lastHash = fs.readFileSync(
        `${ledgerPath}/lastHash_${workingScope}.txt`,
        "utf8"
    );
    return res.status(200).json({ data: lastHash });
};
