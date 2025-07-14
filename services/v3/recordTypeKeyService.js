import { Keyring } from "./keyringService.js";

export const RecordTypeKey = {
    async process(record) {
        switch (record.record_type.split(":")[1]) {
            case "grant":
                await this.grant(record);
                break;
            default:
                console.error("Unknown key record type: ", record.record_type);
        }
    },
    async grant(record) {
        // TODO: make sure we are matching the schema for key.grant

        console.log("Adding 🔑");
        await Keyring.add(
            record.scope,
            record.data.key,
            record.data.roles,
            record.data.exp ?? 0
        );
    },

    async revoke(record) {
        // Make sure the one that revoked it can actually revoke it I guess

        console.log("Revoking 🔑");
        await Keyring.revoke(record.scope, record.data.key);
    },
};
