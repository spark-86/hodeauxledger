import { Record } from "../../services/v1/recordService.js";
import { Keyring } from "../../services/v1/keyringService.js";
import fs from "fs";
import { keyClean } from "../../tools/keyCleaner";

const ledgerPath = process.env.LEDGER_PATH || "/ledger";
const keyPath = process.env.KEY_PATH || "/secrets";

export const BlockGenesis = {
    async execute(record) {
        // See if we have keys
        if (fs.existsSync(`${keyPath}/hodeaux.key`)) {
            throw new Error(
                "Core key already found. Delete to create a new genesis"
            );
        }
        await Keyring.ringAdd("core", record.data.key);
    },
};
