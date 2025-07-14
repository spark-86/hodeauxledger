import { createDb } from "../../tools/db.js";

const recordCacheTable = "records";
const scopeCacheTable = "scopes";
const keyringCacheTable = "keyring";

export const Cache = {
    async loadScopeFromCache(scope, verify = false, hash = "genesis") {
        const db = createDb();
        const scopeData = [];
        const first = db(recordCacheTable)
            .where({
                scope: scope,
                previous_hash: hash === "genesis" ? "" : hash,
            })
            .first();
        if (!first) throw new Error("Couldn't find first record");
        scopeData.push(first);
        let done = false;
        let lastHash = first.current_hash;
        while (!done) {
            const next = db(recordCacheTable)
                .where({
                    scope: scope,
                    previous_hash: lastHash,
                })
                .first();
            if (!next) {
                done = true;
            } else {
                scopeData.push(next);
                lastHash = next.current_hash;
            }
        }
        return scopeData;
    },

    async buildRecordCacheTable() {
        const db = createDb();
        console.log("Builing record cache table...");
        const exists = await db.schema.hasTable(recordCacheTable);
        if (!exists) {
            console.log("Table didn't exist");
            await db.schema.createTable(recordCacheTable, (table) => {
                table.string("previous_hash");
                table.string("protocol").notNullable();
                table.string("scope").notNullable();
                table.string("nonce").notNullable();
                table.integer("at");
                table.string("fingerprint").notNullable();
                table.string("record_type").notNullable();
                table.text("data");
                table.string("signature").notNullable();
                table.string("received_by").notNullable();
                table.string("received_signature").notNullable();
                table.string("current_hash").notNullable();
            });
            console.log("Created table: " + recordCacheTable);
        }
    },

    async buildKeyringCacheTable() {
        const db = createDb();
        const exists = await db.schema.hasTable(keyringCacheTable);
        if (!exists) {
            await db.schema.createTable(keyringCacheTable, (table) => {
                table.string("scope").notNullable();
                table.string("key").notNullable();
                table.string("roles").notNullable();
                table.integer("exp").notNullable();
            });

            console.log("Created table: " + keyringCacheTable);
        }
    },

    async storeRecordInCache(record) {
        const db = createDb();

        await db(recordCacheTable).insert(record);
    },

    async keyringCacheAdd(scope, key, roles = [], exp = 0) {
        const db = createDb();

        await db(keyringCacheTable).insert({
            scope,
            key,
            roles,
            exp,
        });
    },

    async keyringCacheUpdate(scope, key, roles = [], exp = 0, newKey = "") {
        const db = createDb();
        const workingKey = newKey ?? key;
        await db(keyringCacheTable).update({
            key: workingKey,
            roles,
            exp,
        });
    },

    async keyringCacheRevoke(scope, key) {
        const db = createDb();
        await db(keyringCacheTable).where({ scope, key }).delete();
    },
};
