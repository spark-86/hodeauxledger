import { Cache } from "../../services/v4/cacheService.js";

export const HandlerGenesis = {
    async process(record) {
        await Cache.addKey("", record.data.key, ["core"], 0);
        await Cache.addRecord(record);
    },
};
