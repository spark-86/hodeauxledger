import { Cache } from "../../services/v4/cacheService.js";
import { Key } from "../../services/v4/keyService.js";

export const HandlerKey = {
    async process(record, boot = false) {
        switch (record.record_type) {
            case "key:grant":
                await this.grant(record);
                break;
            case "key:revoke":
                await this.revoke(record);
                break;
            default:
                await Cache.addRecord(record);
        }
    },

    async grant(record) {
        await Cache.addKey(record.scope, record.data.key, record.data.roles);
        await Cache.addRecord(record);
    },

    async revoke(record) {
        await Cache.removeKey(record.scope, record.data.key);
        await Cache.addRecord(record);
    },
};
