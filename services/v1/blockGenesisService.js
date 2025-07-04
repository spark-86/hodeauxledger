import { Record } from "../../services/v1/recordService.js";
import { Keyring } from "../../services/v1/keyringService.js";
import fs from "fs";
import { keyClean } from "../../tools/keyCleaner.js";

const ledgerPath = process.env.LEDGER_PATH || "/ledger";
const keyPath = process.env.KEY_PATH || "/secrets";

export const BlockGenesis = {
    async execute(record) {
        console.log("Setting core key: " + record.data.key);
        await Keyring.ringAdd("core", record.data.key);
    },
};
