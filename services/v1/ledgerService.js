import { generateBase32 } from "../../tools/base32.js";
import { Record } from "./recordService.js";

const recordTable = "records";

export const Ledger = {
    async create(data) {
        const recordId = await Record.create({
            ...data,
            at: Date.now(),
            id: "record_" + generateBase32(32),
        });
    },
};
