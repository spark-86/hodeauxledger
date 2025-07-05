import express from "express";
import cors from "cors";
import { configDotenv } from "dotenv";
import fs from "fs";
import http from "http";
import https from "https";
import { Log } from "./tools/logger.js";
import { Keyring } from "./services/v1/keyringService.js";
import { Startup } from "./services/v1/startupServices.js";
import { Record } from "./services/v1/recordService.js";

import appendRoutes from "./routes/v1/appendRoutes.js";
import getRoutes from "./routes/v1/getRoutes.js";
import systemRoutes from "./routes/v1/systemRoutes.js";
import readRoutes from "./routes/v1/readRoutes.js";

configDotenv();

const app = express();
app.use(express.json());
app.use(cors());

app.use("/v1/append", appendRoutes);
app.use("/v1/get", getRoutes);
app.use("/v1/system", systemRoutes);
app.use("/v1/read", readRoutes);

app.use((req, res) => {
    Log.warn(
        "ROUTER",
        req.protocol + "://" + req.get("host") + req.originalUrl + " not found",
        "",
        req.ip
    );
    res.status(404).json({ error: "Not found" });
});

// Scorch our db cache
await Record.flushRecords();
await Keyring.ringFlush();

if (!fs.existsSync(`/ledger/genesis.json`)) {
    await Keyring.genesis();
} else {
    await Startup.buildLedgerFromDisk();
}

// Please hide your http behind a firewall.
// It's twenty fucking twenty five. Use SSL goddammit.
const httpPort = process.env.HTTP_PORT;
const httpsPort = process.env.HTTPS_PORT;

// Set up for SSL
let credentials;
if (process.env.ENVIRONMENT === "production") {
    credentials = {
        key: fs.readFileSync(process.env.PRIVATE_KEY),
        cert: fs.readFileSync(process.env.CERTIFICATE),
    };
}

const httpServer = http.createServer(app);
let httpsServer;

if (process.env.ENVIRONMENT === "production") {
    httpsServer = https.createServer(credentials, app);
}

httpServer.listen(httpPort, () => {
    Log.log("start", "http", `HTTP Server running on port ${httpPort}`, "", "");
});

if (process.env.ENVIRONMENT === "production") {
    httpsServer.listen(httpsPort, () => {
        console.log(`HTTPS Server running on port ${httpsPort}`);
    });
}

export default app;
