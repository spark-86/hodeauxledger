import fs from "fs";
import { Key } from "./keyService.js";
import { Record } from "./recordService.js";
import { Ledger } from "./ledgerService.js";
import { loadConfig } from "./configService.js";
import { generateBase32 } from "../../tools/base32.js";
import crypto from "crypto";

export const Genesis = {
    async letThereBeLight() {
        console.log("Let there be light 💡");
        const config = loadConfig();

        // Look to see if we have a passphrase file
        let passphrase;
        if (!fs.existsSync(`${config.secrets}/passkey.txt`)) {
            console.log("No passphrase file found. Creating a new one.");
            passphrase = generateBase32(32);
            fs.writeFileSync(`${config.secrets}/passkey.txt`, passphrase);
        } else {
            passphrase = fs.readFileSync(
                `${config.secrets}/passkey.txt`,
                "utf8"
            );
        }

        // Generate the master key, if it doesn't exist
        if (!fs.existsSync(`${config.secrets}/hodeaux.key`)) {
            const { publicKey, privateKey } = await Key.generatePair(
                passphrase
            );
            fs.writeFileSync(`${config.secrets}/hodeaux.key`, privateKey);
            fs.writeFileSync(`${config.secrets}/hodeaux.pub`, publicKey);
            console.log("Master key generated.");
        } else {
            console.log("Master key already exists.");
            // Can we unlock it?
            try {
                const masterKey = fs.readFileSync(
                    `${config.secrets}/hodeaux.key`,
                    "utf8"
                );
                const publicKey = await Key.getPublicFromPrivate(
                    masterKey,
                    passphrase
                );
                const publicKeyHash = await Key.calcFingerprint(
                    publicKey.export({
                        type: "spki",
                        format: "der",
                    })
                );
                console.log("Fingerprint: " + publicKeyHash);
            } catch (err) {
                console.log(
                    "Master key is locked. Delete the file and try again."
                );
                process.exit(1);
            }
        }

        // Generate Genesis Record
        const pubKey = Buffer.from(
            Key.rawPublicKey(
                fs.readFileSync(`${config.secrets}/hodeaux.pub`, "utf8")
            ),
            "binary"
        ).toString("base64");
        const fingerprint = await Key.calcFingerprint(Key.rawPublicKey(pubKey));
        const genesisRecord = {
            previous_hash: "",
            protocol: "v1",
            scope: "",
            fingerprint: fingerprint,
            record_type: "genesis",
            data: {
                key: pubKey,
            },
        };

        // Get a hot copy of the private key
        const encryptedPrivate = fs.readFileSync(
            `${config.secrets}/hodeaux.key`,
            "utf8"
        );
        const masterKey = {
            key: encryptedPrivate,
            passphrase,
        };
        const hotKey = crypto.createPrivateKey(masterKey);

        // Sign the record
        const signed = await Record.sign(genesisRecord, hotKey);

        // Save
        fs.writeFileSync(
            `${config.ledger}/genesis.json`,
            JSON.stringify(signed)
        );
        fs.writeFileSync(`${config.ledger}/lastHash_.txt`, signed.current_hash);
        let lastHash = signed.current_hash;

        // If we have a bootstrap.json we go ahead and process it
        if (fs.existsSync("bootstrap.json")) {
            const bootstrap = JSON.parse(
                fs.readFileSync("bootstrap.json", "utf8")
            );
            for (const root of bootstrap.roots) {
                const signedRoot = await Record.sign(
                    {
                        previous_hash: lastHash,
                        protocol: "v1",
                        scope: "",
                        fingerprint: fingerprint,
                        record_type: "root:add",
                        data: {
                            name: root.name,
                            key: root.key,
                        },
                    },
                    hotKey
                );

                console.dir(signedRoot, { depth: null });
                await Ledger.append(signedRoot);
                lastHash = signedRoot.current_hash;
                fs.writeFileSync(
                    `${config.ledger}/lastHash_.txt`,
                    signedRoot.current_hash
                );
            }
        }

        console.log("Genesis record generated.");
    },
};
