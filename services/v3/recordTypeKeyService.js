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

        await Keyring.add(
            record.scope,
            record.data.key,
            record.data.roles,
            record.data.exp ?? 0
        );
    },
};
