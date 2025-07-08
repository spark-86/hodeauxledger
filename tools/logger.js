import chalk from "chalk";
import { loadConfig } from "../services/v2/configService.js";
import fs from "fs";

const logTable = "logs";

const getSeverityIcon = {
    start: "🟢",
    stop: "🔴",
    info: "🔷",
    warn: "⚠️",
    error: "❌",
    fatal: "☠️",
};

export const Log = {
    async log(severity, unit, message, user, ipAddress) {
        try {
            const config = loadConfig();
            fs.appendFileSync(
                config.logfile,
                `${now} ${icon} [${unit}] ${message} (${user}) ${ipAddress}`
            );
            const icon = getSeverityIcon[severity];
            const now = new Date(Date.now()).toLocaleString();
            console.log(
                `${now} ${icon} [${chalk.yellow(
                    unit
                )}] ${message} (${chalk.black.bold(user)}) ${chalk.black.bold(
                    ipAddress
                )}`
            );
            /*console.log(
                now,
                icon,
                "[" + unit + "]",
                message,
                "(" + user + ")",
                "IP:" + ipAddress
            );*/
        } catch (error) {
            console.error(error);
        }
    },

    async info(unit, message, user, ipAddress) {
        await this.log("info", unit, message, user, ipAddress);
    },

    async warn(unit, message, user, ipAddress) {
        await this.log("warn", unit, message, user, ipAddress);
    },

    async error(unit, message, user, ipAddress) {
        await this.log("error", unit, message, user, ipAddress);
    },

    async fatal(unit, message, user, ipAddress) {
        await this.log("fatal", unit, message, user, ipAddress);
    },
};
