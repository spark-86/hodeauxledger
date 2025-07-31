import canonicalize from "canonicalize";
import { createDb } from "../../tools/db.js";

const keyringTable = "keyring";
const recordTable = "records";
const policyTable = "policy";

export const Cache = {
    async addKey(scope, key, roles = [], exp = 0) {
        const db = createDb();
        await db(keyringTable).insert({
            scope,
            key,
            roles: roles.join(","),
            exp,
        });
    },

    async getKey(scope, fingerprint) {
        const db = createDb();
        const key = await db(keyringTable)
            .where({ scope, key: fingerprint })
            .first();
        if (!key) return false;
        return {
            scope: key.scope,
            key: key.key,
            roles: key.roles.split(","),
            exp: key.exp,
        };
    },

    async addRecord(record) {
        const db = createDb();
        const fixedRecord = {
            ...record,
            signatures: canonicalize(record.signatures),
        };
        await db(recordTable).insert(fixedRecord);
    },

    async addPolicy(scope, formattedPolicy) {
        /* Formatted policy: 
        {
            roles_map: [roles],
            quorum_map: [quorum],
            config_json: [config]
        }
        */
        const db = createDb();
        await db(policyTable).insert({
            scope: scope ?? "",
            roles_map: JSON.stringify(formattedPolicy.roles_map),
            quorum_map: JSON.stringify(formattedPolicy.quorum_map),
            config_json: JSON.stringify(formattedPolicy.config_json),
        });
    },

    async getRecord(hash) {
        const db = createDb();
        return await db(recordTable).where({ previous_hash: hash }).first();
    },

    async getScope(scope, recType = "") {
        const db = createDb();
        const output = [];
        const results = await db(recordTable)
            .where({ scope })
            .andWhere("record_type", "like", `%${recType}%`);
        for (const result of results) {
            output.push({
                ...result,
                data: JSON.parse(result.data),
                signatures: JSON.parse(result.signatures),
            });
        }
        return output;
    },

    async getPolicy(scope) {
        const db = createDb();
        const result = await db(policyTable).where({ scope }).first();
        if (!result) return false;
        return {
            roles_map: JSON.parse(result.roles_map),
            quorum_map: JSON.parse(result.quorum_map),
            config_json: JSON.parse(result.config_json),
        };
    },

    async flushKeys() {
        const db = createDb();
        await db(keyringTable).delete();
    },

    async flushRecords() {
        const db = createDb();
        await db(recordTable).delete();
    },

    async flushPolicy() {
        const db = createDb();
        await db(policyTable).delete();
    },

    async flushAll() {
        await this.flushKeys();
        await this.flushRecords();
        await this.flushPolicy();
    },
};
