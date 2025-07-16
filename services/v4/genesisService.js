import { Disk } from "./diskService.js";
import { Key } from "./keyService.js";
import sodium from "libsodium-wrappers-sumo";
import { Usher } from "./usherService.js";

let keys = [];

export const Genesis = {
    async start() {
        console.log("Building keys...");
        const keys = await buildKeys("password");
        console.log("Keys built!");
        console.log("Signing genesis records...");
        await signGenesisRecords(keys);
        console.log("Genesis records signed!");
    },
};

const buildKeys = async (passphrase) => {
    await sodium.ready;
    const { publicKey: masterPublicKey, privateKey: masterPrivateKey } =
        await Key.generate();
    await Disk.saveKey("master", "pub", {
        key: sodium.to_base64(masterPublicKey),
    });
    const encryptedMasterPrivateKey = await Key.encrypt(
        masterPrivateKey,
        passphrase
    );
    await Disk.saveKey("master", "enc", {
        ...encryptedMasterPrivateKey,
    });

    const { publicKey: keymasterPublic, privateKey: keymasterPrivate } =
        await Key.generate();
    await Disk.saveKey("keymaster", "pub", {
        key: sodium.to_base64(keymasterPublic),
    });
    await Disk.saveKey("keymaster", "hot", {
        key: sodium.to_base64(keymasterPrivate),
    });

    const { publicKey: usherPublic, privateKey: usherPrivate } =
        await Key.generate();
    await Disk.saveKey("usher", "pub", {
        key: sodium.to_base64(usherPublic),
    });
    await Disk.saveKey("usher", "hot", {
        key: sodium.to_base64(usherPrivate),
    });

    return {
        masterPublicKey,
        masterPrivateKey,
        keymasterPublic,
        keymasterPrivate,
        usherPublic,
        usherPrivate,
    };
};

const signGenesisRecords = async (keys) => {
    await sodium.ready;
    const genesisRhex = {
        protocol: "v1",
        scope: "",
        nonce: sodium.to_base64(sodium.randombytes_buf(32)),
        record_type: "genesis",
        data: {
            name: "Trust Architect Core",
            key: sodium.to_base64(keys.masterPublicKey),
        },
        signatures: [
            {
                fingerprint: sodium.to_base64(keys.masterPublicKey),
                signature: "",
                type: "owner",
            },
        ],
    };
    const signedGenesisRhex = await Key.sign(
        genesisRhex,
        keys.masterPrivateKey
    );
    const usherSignedGenesisRhex = await Usher.sign(
        signedGenesisRhex,
        "",
        keys.masterPrivateKey
    );
    console.log("Signed record:");
    console.dir(usherSignedGenesisRhex, { depth: null });

    const policySetRhex = {
        protocol: "v1",
        scope: "",
        nonce: sodium.to_base64(sodium.randombytes_buf(32)),
        fingerprint: sodium.to_base64(keys.masterPublicKey),
        record_type: "policy:set",
        data: {
            schema: "policy.set/1",
            write: ["core", "root"],
            read: ["any"],
            mirror: ["any"],
            grant: ["core", "root"],
            revoke: ["core", "root"],
            allow_records: ["scope:*", "core:*"],
            deny_records: ["all"],
            quorum: {
                write: 1,
                grant: 1,
                revoke: 2,
            },
        },
    };
    const signedPolicySetRhex = await Key.sign(
        policySetRhex,
        keys.masterPrivateKey
    );
    const usherSignedPolicySetRhex = await Usher.sign(
        signedPolicySetRhex,
        "",
        keys.masterPrivateKey
    );
    console.log("Signed record:");
    console.dir(usherSignedPolicySetRhex, { depth: null });

    const keymasterSetRhex = {
        protocol: "v1",
        scope: "",
        nonce: sodium.to_base64(sodium.randombytes_buf(32)),
        fingerprint: sodium.to_base64(keys.masterPublicKey),
        record_type: "key:grant",
        data: {
            schema: "key.grant/1",
            name: "Trust Architect Keymaster",
            key: sodium.to_base64(keys.keymasterPublic),
        },
    };
};
