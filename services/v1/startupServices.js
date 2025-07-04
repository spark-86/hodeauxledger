import fs from "fs";
import crypto from "crypto";
import { configDotenv } from "dotenv";
import { hex2base32 } from "../../tools/base32.js";
import { Log } from "../../tools/logger.js";
import { Record } from "./recordService.js";
import { Keyring } from "./keyringService.js";
import { keyClean } from "../../tools/keyCleaner.js";

configDotenv();

const ledgerPath = process.env.LEDGER_PATH || "/ledger";

export const Startup = {
    async buildLedgerFromDisk() {
        if (!fs.existsSync(ledgerPath + "/genesis.json")) {
            throw new Error("Genesis record not found");
        }

        const genesis = JSON.parse(
            fs.readFileSync(ledgerPath + "/genesis.json", "utf8")
        );
        const masterKey = fs.readFileSync("/secrets/hodeaux.key", "utf8");

        // Generate a public key from masterKey and see if matches genesis
        const publicKey = crypto.createPublicKey({
            key: masterKey,
            format: "pem",
            type: "pkcs8",
            cipher: "aes-256-cbc",
            passphrase: process.env.PASSKEY,
        });

        const publicKeyString = keyClean(
            publicKey.export({ format: "pem", type: "spki" })
        );

        if (keyClean(genesis.data.key) !== publicKeyString)
            throw new Error("Genesis record does not match master key");
        await Log.log("start", "ledger", "Ledger building from disk", "", "");
        // Now we walk our list of hashes til we deadend
        let done = false;
        let currentHash = hex2base32(
            new Buffer.from(genesis.current_hash, "base64").toString("hex")
        );

        await this.processBlock(genesis);

        while (!done) {
            if (fs.existsSync(ledgerPath + "/" + currentHash + ".json")) {
                const block = JSON.parse(
                    fs.readFileSync(
                        ledgerPath + "/" + currentHash + ".json",
                        "utf8"
                    )
                );
                await this.processBlock(block);
                // convert current_hash to base16 from base64
                const hex = Buffer.from(block.current_hash, "base64").toString(
                    "hex"
                );
                currentHash = hex2base32(hex);
            } else done = true;
        }
        await Log.log("start", "ledger", "Ledger built from disk", "", "");
        return genesis;
    },

    async processBlock(data) {
        //console.dir(data, { depth: null });

        const verified = await Record.verify(data);
        if (!verified) {
            throw new Error("Record verification failed");
        }
        console.log("Verified record", data.previous_hash);

        switch (data.record_type) {
            case "genesis":
                await Keyring.ringAdd("core", data.data.key);
                break;
            case "root:add":
                await Keyring.ringAdd("root", data.key);
                break;
            case "root:update":
                await Keyring.ringUpdate(data.old_key, "root", data.new_key);
                break;
            case "root:revoke":
                await Keyring.ringRevoke(data.previous_hash);
                break;
            case "issuing:add":
                await Keyring.ringAdd("issuing", data.key);
                break;
            case "agent:add":
                await Keyring.ringAdd("agent", data.key);
                break;
            default:
                break;
        }
        await Record.addToDb(data);

        console.log(data);
        return data;
    },
};
