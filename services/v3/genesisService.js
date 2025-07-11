import { Key } from "./keyService.js";
import fs from "fs";
import path from "path";
import { loadConfig } from "../../tools/v3/config.js";
import sodium from "libsodium-wrappers-sumo";
import { Record } from "./recordService.js";
import { Ledger } from "./ledgerService.js";
import { Usher } from "./usherService.js";

export const Genesis = {
    async letThereBeLight() {
        console.log("Initializing HodeauxLedger Genesis...");
        console.log("Let there be light! 💡");
        const config = loadConfig();

        console.log("Creating master key...");
        const { publicKey, privateKey } = await Key.generatePair();
        if (config.passphrase) {
            console.log(config.passphrase);
            await nextStep(config.passphrase, publicKey, privateKey);
        } else {
            console.error("Must specify --passphrase <passphrase>");
            process.exit(1);
        }
    },
};

const nextStep = async (password, publicKey, privateKey) => {
    await sodium.ready;
    const config = loadConfig();
    // Encrypt master key
    const encrypted = await Key.encryptKey(
        sodium.to_base64(privateKey),
        password
    );
    fs.writeFileSync(
        path.join(config.secrets, "master.enc.json"),
        JSON.stringify(encrypted)
    );
    fs.writeFileSync(
        path.join(config.secrets, "master.pub.json"),
        JSON.stringify({
            key: publicKey,
        })
    );

    // Generate usher key. We leave that shit HHHHHOOOOOOOOOOTTTTT!
    console.log("Generating usher key...");
    const { publicKey: usherPub, privateKey: usherPriv } =
        await Key.generatePair();
    fs.writeFileSync(
        path.join(config.secrets, "usher.hot.json"),
        JSON.stringify({
            key: usherPriv,
        })
    );
    fs.writeFileSync(
        path.join(config.secrets, "usher.pub.json"),
        JSON.stringify({
            key: usherPub,
        })
    );

    // Generate a key management key
    console.log("Generating keymaster key...");
    const { publicKey: keyPub, privateKey: keyPriv } = await Key.generatePair();
    fs.writeFileSync(
        path.join(config.secrets, "keymaster.hot.json"),
        JSON.stringify({
            key: keyPriv,
        })
    );
    fs.writeFileSync(
        path.join(config.secrets, "keymaster.pub.json"),
        JSON.stringify({
            key: keyPub,
        })
    );

    await createGenesisRecords(privateKey, keyPriv, usherPub);
};

const createGenesisRecords = async (masterPriv, keymaster, usherPub) => {
    await sodium.ready;
    const config = loadConfig();
    console.log("Creating genesis record...");
    const base64privKey = sodium.to_base64(masterPriv);
    console.log(base64privKey);
    const pubKey = await Key.getPublicKey(base64privKey);
    console.log("cleared first");
    const genesisRecord = {
        previous_hash: "",
        protocol: "v1",
        scope: "",
        nonce: sodium.to_base64(sodium.randombytes_buf(32)),
        fingerprint: pubKey,
        record_type: "genesis",
        data: {
            name: "HodeauxLedger Core Trust",
            key: pubKey,
        },
    };
    console.log("Trying to sign genesis...");
    const signed = await Record.sign(genesisRecord, masterPriv);
    console.dir(signed, { depth: null });
    console.log("Trying to usher sign");
    const usherSigned = await Usher.signPayload(signed, masterPriv);
    console.dir(usherSigned, { depth: null });
    let hash = await Record.calcCurrentHash(usherSigned);
    await Ledger.append({
        ...usherSigned,
        current_hash: hash,
    });

    console.log("Creating keymaster record...");
    const assignKeymasterRecord = {
        previous_hash: hash,
        protocol: "v1",
        scope: "",
        nonce: sodium.to_base64(sodium.randombytes_buf(32)),
        fingerprint: pubKey,
        record_type: "key:grant",
        data: {
            key: await Key.getPublicKey(sodium.to_base64(keymaster)),
            roles: ["keymaster"],
        },
    };
    const signedKeymaster = await Record.sign(
        assignKeymasterRecord,
        masterPriv
    );
    const usherSignedKeymaster = await Usher.signPayload(
        signedKeymaster,
        masterPriv
    );
    hash = await Record.calcCurrentHash(usherSignedKeymaster);
    await Ledger.append({
        ...usherSignedKeymaster,
        current_hash: hash,
    });

    console.log("Creating usher record...");
    const assignUsherRecord = {
        previous_hash: hash,
        protocol: "v1",
        scope: "",
        nonce: sodium.to_base64(sodium.randombytes_buf(32)),
        fingerprint: pubKey,
        record_type: "key:grant",
        data: {
            key: sodium.to_base64(usherPub),
            roles: ["usher"],
        },
    };
    const signedUsher = await Record.sign(assignUsherRecord, masterPriv);
    const usherSignedUsher = await Usher.signPayload(signedUsher, masterPriv);
    hash = await Record.calcCurrentHash(usherSignedUsher);
    await Ledger.append({
        ...usherSignedUsher,
        current_hash: hash,
    });
    console.log("Genesis records created and appended to ledger.");
    process.exit(0);
};
