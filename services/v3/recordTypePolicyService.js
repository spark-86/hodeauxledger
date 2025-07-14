import { Policy } from "./policyService.js";

export const RecordTypePolicy = {
    async process(record) {
        switch (record.record_type) {
            case "policy:set":
                await this.set(record);
                break;
            default:
                console.log("Invalid policy R⬢ type");
        }
    },

    async set(record) {
        console.log("Setting scope policy for /" + record.scope + "/.");
        await Policy.set(record.scope, record.data);
    },
};
