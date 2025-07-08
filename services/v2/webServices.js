import fs from "fs";

export const webAppend = async (req, res) => {
    console.log(req.ip);
};

export const webRead = async (req, res) => {};

export const webTip = async (req, res) => {
    const { scope } = req.params;

    const searchScope = scope ? scope : "";
    if (!fs.existsSync(`ledger/${searchScope}/lastHash.txt`)) {
        return res.status(404).json({ error: "Scope not found" });
    }
    res.status(200).json({
        hash: fs.readFileSync(`ledger/${searchScope}/lastHash.txt`, "utf8"),
    });
    console.log(req.ip);
};
