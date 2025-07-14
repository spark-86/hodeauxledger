import { createDb } from "../../tools/db.js";
import { Disk } from "./diskService.js";

const keyringTable = "keyring";
const myKeys = [];

export const Keyring = {
    /**
     * Adds a new keyring entry
     * @param {string} scope - Ledger scope of the key
     * @param {string} key - Public key (base64)
     * @param {array} roles - Roles assigned to the key (optional)
     * @param {number} exp - Expiration time in seconds (optional, default is 0)
     */
    async add(scope, key, roles = [], exp = 0) {
        const db = createDb();
        await db(keyringTable).insert({
            scope,
            key,
            roles: roles.join(","),
            exp,
        });
    },

    /**
     * Revokes a keyring entry
     * @param {string} scope - Ledger scope of the key
     * @param {string} key - Public key (base64)
     */
    async revoke(scope, key) {
        const db = createDb();
        await db(keyringTable).where({ scope, key }).delete();
    },

    /**
     * Retrieves a keyring entry
     * @param {string} scope - Ledger scope of the key
     * @param {string} key - Public key (base64)
     */
    async get(scope, key) {
        const db = createDb();
        return await db(keyringTable).where({ scope, key });
    },

    /**
     * Retrieves all keyring entries for a scope
     * @param {string} scope - Ledger scope of the key
     */
    async getByScope(scope) {
        const db = createDb();
        return await db(keyringTable).where({ scope });
    },

    /**
     * Flushes the keyring
     */
    async flush() {
        const db = createDb();
        await db(keyringTable).delete();
    },

    async getMyKeys() {
        const masterKey = await Disk.getKeyFromFile("master");
        const keymasterKey = await Disk.getKeyFromFile("keymaster");
        const usherKey = await Disk.getKeyFromFile("usher");
        myKeys.push({ name: "master", key: masterKey });
        myKeys.push({ name: "keymaster", key: keymasterKey });
        myKeys.push({ name: "usher", key: usherKey });
        return myKeys;
    },
};
