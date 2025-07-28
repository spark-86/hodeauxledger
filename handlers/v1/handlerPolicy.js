import { Cache } from "../../services/v4/cacheService.js";
import { Scope } from "../../services/v4/scopeService.js";

export const HandlerPolicy = {
    async process(record) {
        switch (record.record_type) {
            case "policy:set":
                await Scope.setPolicy(record.data.scope, record.data);
                return await Cache.addRecord(record);
            default:
        }
    },
};
