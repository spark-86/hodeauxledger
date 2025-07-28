import { Cache } from "../../services/v4/cacheService.js";
import { HandlerGenesis } from "./handlerGenesis.js";
import { HandlerKey } from "./handlerKey.js";
import { HandlerPolicy } from "./handlerPolicy.js";
import { HandlerScope } from "./handlerScope.js";

export const Handler = {
    async process(record, boot = false) {
        const parts = record.record_type.split(":");
        switch (parts[0]) {
            case "genesis":
                return await HandlerGenesis.process(record);
            case "key":
                return await HandlerKey.process(record, boot);
            case "scope":
                return HandlerScope.process(record, boot);
            case "policy":
                return await HandlerPolicy.process(record);
            default:
                return await Cache.addRecord(record);
        }
    },
};
