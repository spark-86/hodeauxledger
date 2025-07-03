import { keyClean } from "../../tools/keyCleaner.js";
import { Keyring } from "./keyringService.js";

export const BlockRoot = {
    async execute(record) {
        // TODO: Make sure this is signed by the master key, as that
        // is the only authority to manage Root Authorities
        switch (record.data.type) {
            case "root:add":
                await this.add(record);
                break;
            case "root:update":
                await this.update(record);
                break;
            case "root:revoke":
                await this.revoke(record);
                break;
            default:
        }

        await Keyring.ringAdd("root", keyClean(record.data.key));
    },

    async add(record) {
        await Keyring.ringAdd("root", keyClean(record.data.key));
    },
    async update(record) {
        await Keyring.ringUpdate(
            record.data.old_key_hash,
            "root",
            keyClean(record.data.new_key)
        );
    },
    async revoke(record) {
        await Keyring.ringRevoke(record.data.key_hash);
    },
};
