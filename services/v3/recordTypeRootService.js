import { Keyring } from "./keyringService.js";

export const RecordTypeRoot = {
    async add(data) {
        console.log("Adding root: " + data.data.name);
        await Keyring.add(
            data.scope,
            data.data.key,
            data.data.roles.join(","),
            0
        );
    },

    async revoke(data) {
        console.log("Revoking root: " + data.data.name);
        await Keyring.revoke(data.scope, data.data.key);
    },
};
