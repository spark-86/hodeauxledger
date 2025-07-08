import fs from "fs";
import sodium from "libsodium-wrappers-sumo";
import { Key } from "./keyService.js";
import { Record } from "./recordService.js";
import { Ledger } from "./ledgerService.js";
import { loadConfig } from "./configService.js";
import { Log } from "../../tools/logger.js";

export const Genesis = {
    async letThereBeLight() {
        await sodium.ready;
        await Log.log("start", "GENESIS", "Let there be light 💡", "", "");

        const config = loadConfig();
        if (config.verbose) console.log(`[GENESIS]: Starting key handling...`);
        const passphrase = await loadOrCreatePassphrase(config);
        const { publicKey, privateKey } = await loadOrCreateMasterKey(
            config,
            passphrase
        );
        const hotKey = await loadHotKey(config, passphrase);

        const genesisRecord = await createGenesisRecord(publicKey);
        const signedGenesis = await Record.sign(genesisRecord, hotKey);
        await Ledger.append(signedGenesis);

        await maybeProcessBootstrap(config, hotKey, signedGenesis.current_hash);

        console.log("Genesis record generated.");
    },
};

// --- Helpers ---

async function loadOrCreatePassphrase(config) {
    const file = `${config.secrets}/passkey.txt`;

    if (!fs.existsSync(file)) {
        console.log("No passphrase file found. Creating a new one.");
        const passphrase = sodium.to_base64(sodium.randombytes_buf(32));
        fs.writeFileSync(file, passphrase);
        return sodium.from_base64(passphrase);
    }

    return sodium.from_base64(fs.readFileSync(file, "utf8"));
}

async function loadOrCreateMasterKey(config, passphrase) {
    const keyFile = `${config.secrets}/master.enc.json`;
    const pubFile = `${config.secrets}/master.pub`;

    if (!fs.existsSync(keyFile)) {
        const { publicKey, privateKey } = await Key.generatePair();
        const encrypted = await Key.encryptPrivateKey(privateKey, passphrase);
        fs.writeFileSync(keyFile, JSON.stringify(encrypted));
        fs.writeFileSync(pubFile, publicKey);
        console.log("Master key generated.");
        return { publicKey, privateKey };
    }

    console.log("Master key already exists.");
    try {
        const encrypted = JSON.parse(fs.readFileSync(keyFile, "utf8"));
        encrypted.passphrase = passphrase;
        const privateKey = await Key.decryptPrivateKey(encrypted);
        const publicKey = fs.readFileSync(pubFile, "utf8");
        return { publicKey, privateKey };
    } catch (err) {
        console.error("Master key is locked. Delete the file and try again.");
        process.exit(1);
    }
}

async function loadHotKey(config, passphrase) {
    const encrypted = JSON.parse(
        fs.readFileSync(`${config.secrets}/master.enc.json`, "utf8")
    );
    encrypted.passphrase = passphrase;
    return await Key.decryptPrivateKey(encrypted);
}

async function createGenesisRecord(publicKey) {
    const nonce = sodium.randombytes_buf(32);
    return {
        previous_hash: "",
        protocol: "v1",
        scope: "",
        nonce: sodium.to_base64(nonce),
        fingerprint: `${publicKey.trim()}`, // Trim helps prevent newline bugs
        record_type: "genesis",
        data: { key: publicKey.trim() },
    };
}

async function maybeProcessBootstrap(config, hotKey, initialHash) {
    const file = "bootstrap.json";
    if (!fs.existsSync(file)) return;

    let lastHash = initialHash;
    const { roots } = JSON.parse(fs.readFileSync(file, "utf8"));
    const fingerprint = `${fs
        .readFileSync(`${config.secrets}/master.pub`, "utf8")
        .trim()}`;

    for (const root of roots) {
        const record = {
            previous_hash: lastHash,
            protocol: "v1",
            scope: "",
            fingerprint,
            record_type: "root:add",
            data: {
                name: root.name,
                key: root.key,
            },
        };

        const signed = await Record.sign(record, hotKey);
        console.dir(signed, { depth: null });

        await Ledger.append(signed);
        lastHash = signed.current_hash;
        fs.writeFileSync(`${config.ledger}/lastHash.txt`, lastHash);
    }
}

const generateFirstScope = async () => {
    return {
        protocol: "v1",
        scope: "",
        record_type: "scope:genesis",
    };
};

const setFirstPolicy = async () => {
    return {
        protocol: "v1",
        scope: "",
        record_type: "policy:set",
        data: {
            schema: "policy_set_r1",
            policy: {
                access: {
                    write: ["root", "core"],
                    read: ["public"],
                    allow: [
                        "scope:genesis",
                        "key:grant",
                        "key:revoke",
                        "policy:set",
                        "core:note",
                    ],
                },
                quorum: {
                    type: "3-of-5",
                    authorizedKeys: ["", "", "", "", ""],
                },
                caching: 144, // hours
            },
        },
    };
};
