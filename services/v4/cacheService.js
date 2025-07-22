import { createDb } from "../../tools/db.js";

const keyringTable = "keyring";
const recordTable = "records";

export const Cache = {
    async addKey(scope, key, roles = [], exp = 0) {
        const db = createDb();
        await db(keyringTable).insert({ scope, key, roles, exp });
    },

    async getKey(scope, fingerprint) {
        const db = createDb();
        return await db(keyringTable).where({ scope, fingerprint }).first();
    },

    async addRecord(record) {
        const db = createDb();
        await db(recordTable).insert(record);
    },

    async getRecord(hash) {
        const db = createDb();
        return await db(recordTable).where({ previous_hash: hash }).first();
    },

    async getScope(scope, recType = "") {
        const db = createDb();
        return await db(recordTable)
            .where({ scope })
            .andWhere("recType", "like", `%${recType}%`);
    },

    async flushKeys() {
        const db = createDb();
        await db(keyringTable).delete();
    },

    async flushRecords() {
        const db = createDb();
        await db(recordTable).delete();
    },
};
