import { createDb } from "../../tools/db.js";

let mirroredScopes = {};
let hostedScopes = {};
let cachedScopes = {};

const recordsCacheTable = "records";

export const Scope = {
    async addMirror(scope) {},

    async addHosted(scope) {},

    async cacheScope(scope) {
        if (cachedScopes[scope]) return cachedScopes[scope];

        const splitScope = scope.split(".");
        if (splitScope.length === 1) {
            // We're caching a root? Prolly not something a non-root
            // needs to do
        }
    },

    async readFromHash(scope, hash = "genesis", recordType = null) {
        const db = createDb();
        const scopeData = [];
        let workingHash = hash === "genesis" ? "" : hash;

        // Try to get the first record
        let current = await db(recordsCacheTable)
            .where({ scope, previous_hash: workingHash })
            .first();

        if (!current) return scopeData;

        // Only add it if it matches the desired record type
        if (!recordType || current.record_type === recordType) {
            scopeData.push(current);
        }

        workingHash = current.current_hash;

        // Follow the chain forward
        while (true) {
            current = await db(recordsCacheTable)
                .where({ scope, previous_hash: workingHash })
                .first();

            if (!current) break;

            if (!recordType || current.record_type === recordType) {
                scopeData.push(current);
            }

            workingHash = current.current_hash;
        }

        return scopeData;
    },
};
