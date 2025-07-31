import chalk from "chalk";
import { Cache } from "../../services/v4/cacheService.js";
import { Disk } from "../../services/v4/diskService.js";
import { Key } from "../../services/v4/keyService.js";
import { Usher } from "../../services/v4/usherService.js";
import path from "path";
import { loadConfig } from "../../tools/v4/config.js";

export const HandlerScope = {
    async process(record, boot = false) {
        switch (record.record_type) {
            case "scope:create":
                await this.create(record, boot);
                break;
            case "scope:seal":
                await this.seal(record, boot);
                break;
        }
    },
    async create(record, boot) {
        const config = loadConfig();
        if (boot) {
            const scopeData = await Disk.loadScope(record.data.scope);
            if (scopeData) {
                for (const node of scopeData) {
                    await Cache.addRecord(node);
                    console.log(
                        chalk.blackBright(
                            `Loaded ${node.scope} node: ${node.record_type} with hash: ${node.current_hash}`
                        )
                    );
                }
            }
            await Cache.addRecord(record);
        } else {
            // Validate Genesis payload
            const genesisRecord = record.data.genesis;
            if (!genesisRecord) {
                throw new Error("Missing genesis record");
            }
            if (genesisRecord.record_type !== "scope:genesis") {
                throw new Error("Invalid genesis record");
            }
            const verified = await Key.verify(genesisRecord, "owner");
            if (!verified) {
                throw new Error("Genesis record did not validate");
            }

            // Sign Genesis
            const usherHotKey = await Disk.loadKey("usher", "hot");
            if (!usherHotKey) {
                throw new Error("Could not load usher hot key");
            }
            const usherSigned = await Usher.sign(
                genesisRecord,
                "",
                usherHotKey.key
            );

            // Create new scope here
            const scopePath = path.join(config.ledger, record.data.scope);
            if (fs.existsSync(scopePath)) {
                throw new Error("Scope already exists");
            }
            fs.mkdirSync(scopePath);
            await Disk.saveRecord(usherSigned);
            await Disk.updateTip(record.data.scope, genesisRecord.current_hash);
            await Cache.addRecord(record);
            await Cache.addRecord(usherSigned);
        }
    },

    async seal(record, boot) {},
};
