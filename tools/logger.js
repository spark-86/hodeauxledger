import db from "../tools/db.js";

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
            await db(logTable).insert({
                at: Date.now(),
                severity,
                unit,
                message,
                user_hash: user,
                ip_address: ipAddress,
            });
            const icon = getSeverityIcon[severity];
            const now = new Date(Date.now()).toLocaleString();
            console.log(
                now,
                icon,
                "[" + unit + "]",
                message,
                "(" + user + ")",
                "IP:" + ipAddress
            );
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
