import knex from "knex";
import { loadConfig } from "../tools/v3/config.js";

export const createDb = () => {
    const config = loadConfig();

    const db = knex({
        client: "mysql2",
        connection: {
            host: config.db.host,
            port: config.db.port || 3306,
            user: config.db.user || "root",
            password: config.db.password || "",
            database: config.db.database || "ledger",
        },
    });
    return db;
};
