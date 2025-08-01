import { fileURLToPath } from "url";
import { loadConfig } from "../../tools/v4/config.js";
import { Cache } from "./cacheService.js";
import { Disk } from "./diskService.js";
import fs from "fs";
import { Match } from "./matchService.js";

export const Scope = {
    async canAppend(key, scope, recordType) {
        const policy = await this.getPolicy(scope);
        if (!policy) return false;
        if (!policy.roles_map.append_roles) return false;
        if (policy.roles_map.append_roles.includes("any")) return true;
        const cachedKey = await Cache.getKey(scope, key);
        if (!cachedKey) return false;
        let success = false;
        for (const appendRole of policy.roles_map.append_roles) {
            if (cachedKey.roles.includes(appendRole)) {
                success = true;
                break;
            }
        }
        for (const allowedRhex of policy.allow_rhex) {
            if (Match.rhex(recordType, allowedRhex)) {
                success = true;
                break;
            }
        }
        for (const deniedRhex of policy.deny_rhex) {
            if (Match.rhex(recordType, deniedRhex)) {
                success = false;
                break;
            }
        }
        return success;
    },

    async canRead(key, scope) {
        const config = loadConfig();
        if (config.verbose) console.log(`Scope (${scope}) key: ${key}`);
        const policy = await this.getPolicy(scope);
        if (config.verbose) console.log("Policy:", policy);
        if (!policy) return false;
        if (!policy.roles_map.read_roles) return false;
        if (policy.roles_map.read_roles.includes("any")) return true;
        const cachedKey = await Cache.getKey(scope, key);
        if (config.verbose) console.log("Cached key:", cachedKey);
        if (!cachedKey) return false;
        let success = false;

        for (const readRole of policy.roles_map.read_roles) {
            if (cachedKey.roles.includes(readRole)) {
                success = true;
                break;
            }
        }
        return success;
    },

    async getPolicy(scope) {
        const cachedPolicy = await Cache.getPolicy(scope);
        if (!cachedPolicy) return false;
        return cachedPolicy;
    },
    async setPolicy(scope, policy) {
        // Validate policy to make sure it fits schema
        if (!policy.schema.startsWith("policy.set"))
            throw new Error("Invalid policy schema");
        if (
            !policy.append_roles ||
            !policy.read_roles ||
            !policy.quorum_roles ||
            !policy.keymaster_roles
        )
            throw new Error("Missing core policy");
        const roles_map = {
            append_roles: policy.append_roles,
            read_roles: policy.read_roles,
            quorum_roles: policy.quorum_roles,
            keymaster_roles: policy.keymaster_roles,
        };
        if (!policy.quorum_map) throw new Error("Missing quorum policy");
        const quorum_map = policy.quorum_map;
        const config_json = policy;
        const formattedPolicy = {
            roles_map,
            quorum_map,
            config_json,
        };
        await Cache.addPolicy(scope, formattedPolicy);
        return formattedPolicy;
    },

    async create(scope, genesisRec) {
        const config = loadConfig();
        const dir = fileURLToPath(new URL(config.ledger), import.meta.url);
        const scopeDir = path.join(dir, scope);
        if (fs.existsSync(scopeDir)) throw new Error("Scope already exists");
        fs.mkdirSync(scopeDir);
        await Disk.saveRecord(genesisRec);
        await Disk.updateTip(scope, genesisRec.current_hash);
    },
};
