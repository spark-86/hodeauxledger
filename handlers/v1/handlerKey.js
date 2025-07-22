import { Cache } from "../../services/v4/cacheService.js";
import { Key } from "../../services/v4/keyService.js";

export const HandlerKey = {
    async process(record) {
        switch (record.record_type) {
            case "key:grant":
                await this.grant(record);
                break;
            case "key:revoke":
                await this.revoke(record);
                break;
        }
    },

    async grant(record) {
        await Cache.addKey(record.scope, record.data.key, record.data.roles);
    },

    async revoke(record) {
        await Cache.removeKey(record.scope, record.data.key);
    },
};
