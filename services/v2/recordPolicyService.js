import { createDb } from "../../tools/db.js";

const recordTable = "records";

export const RecordPolicy = {
    async getCurrentPolicy(scope) {
        const db = createDb();

        const currentPolicy = db(recordTable)
            .where({ record_type: "policy:set", scope })
            .orderBy("at", "desc")
            .first();

        if (!currentPolicy) throw new Error("Scope policy not in cache");
    },
};
