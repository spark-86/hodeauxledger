// config.js
import fs from "fs";

let cachedConfig = null;

export function loadConfig(path) {
    if (cachedConfig) return cachedConfig;

    if (!path) return;

    if (!fs.existsSync(path)) {
        console.error("Config file not found: " + path);
        process.exit(1);
    }

    const raw = fs.readFileSync(path, "utf-8");
    cachedConfig = JSON.parse(raw);
    if (cachedConfig.secrets.endsWith("/")) {
        cachedConfig.secrets = cachedConfig.secrets.slice(0, -1);
    }
    if (cachedConfig.ledger.endsWith("/")) {
        cachedConfig.ledger = cachedConfig.ledger.slice(0, -1);
    }
    console.log("Loaded config from " + path);
    return cachedConfig;
}
