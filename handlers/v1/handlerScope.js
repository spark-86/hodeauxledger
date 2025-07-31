import chalk from "chalk";
import { Cache } from "../../services/v4/cacheService.js";
import { Disk } from "../../services/v4/diskService.js";
import { Key } from "../../services/v4/keyService.js";
import { Usher } from "../../services/v4/usherService.js";
import path from "path";
import { loadConfig } from "../../tools/v4/config.js";
import { fileURLToPath } from "url";
import fs from "fs";
import { Handler } from "./handler.js";

export const HandlerScope = {
    async process(record, boot = false) {
        switch (record.record_type) {
            case "scope:create":
                await this.create(record, boot);
                break;
            case "scope:genesis":
                await this.genesis(record, boot);
                break;
            case "scope:seal":
                await this.seal(record, boot);
                break;
        }
    },
    async create(record, boot) {
        const config = loadConfig();
        if (boot) {
            const scopeData = await Disk.loadScope(record.data.new_scope);
            if (scopeData) {
                for (const node of scopeData) {
                    await Cache.addRecord(node);
                    console.log(
                        chalk.blackBright(
                            `Loaded ${node.scope} node: ${node.record_type} with hash: ${node.current_hash}`
                        )
                    );
                    const handled = await Handler.process(node, true);
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
            const dirname = fileURLToPath(
                new URL(config.ledger, import.meta.url)
            );
            const scopePath = path.join(dirname, record.data.new_scope);
            if (fs.existsSync(scopePath)) {
                throw new Error("Scope already exists");
            }
            fs.mkdirSync(scopePath);
            await Disk.saveRecord(usherSigned);
            await Disk.updateTip(
                record.data.new_scope,
                usherSigned.current_hash
            );
            await Cache.addRecord(record);
            await Cache.addRecord(usherSigned);
        }
    },

    async genesis(record, boot) {
        if (boot) {
            for (const authority of record.data.authorities) {
                await Cache.addKey(record.scope, authority.key, ["authority"]);
                await Cache.addPolicy(record.scope, {
                    roles_map: {
                        append_roles: ["authority"],
                        read_roles: ["authority"],
                        quorum_roles: ["authority"],
                        keymaster_roles: ["authority"],
                    },
                    quorum_map: {
                        all: 1,
                    },
                    config_json: {
                        append_roles: ["authority"],
                        read_roles: ["authority"],
                        quorum_roles: ["authority"],
                        keymaster_roles: ["authority"],
                        allow_rhex: ["all"],
                        deny_rhex: ["none"],
                        request_logging: "none",
                        description: "Generic Scope Policy Set",
                        tags: ["authority"],
                    },
                });
                await Cache.addRecord(record);
            }
        } else {
            // This should never occur. Scope:genesis records get introduced
            // through the requesting scope:create
        }
    },

    async seal(record, boot) {},
};
