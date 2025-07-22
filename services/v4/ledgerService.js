import { hex2base32 } from "../../tools/base32.js";
import { loadConfig } from "../../tools/v4/config.js";
import { fileURLToPath } from "url";
import path from "path";
import { Disk } from "./diskService.js";
import { Key } from "./keyService.js";

export const Ledger = {
    async append(record) {
        await Disk.saveRecord(record);
    },

    async verifyScope(scope) {
        const scopeData = await Disk.loadScope(scope);
        for (const record of scopeData) {
            if (!(await Key.verify(record))) return false;
        }
        return scopeData;
    },
};
