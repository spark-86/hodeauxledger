import { Disk } from "./diskService.js";
import { Key } from "./keyService.js";
import sodium from "libsodium-wrappers-sumo";
import { Usher } from "./usherService.js";
import { loadConfig } from "../../tools/v4/config.js";
import { Time } from "./timeService.js";
import { Ledger } from "./ledgerService.js";

let keys = [];

export const Genesis = {
    async start() {
        const config = loadConfig();
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
    const config = loadConfig();
    const { publicKey: masterPublicKey, privateKey: masterPrivateKey } =
        await Key.generate();
    console.log(masterPrivateKey);
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
    const config = loadConfig();

    // *** Genesis record
    const genesisRhex = {
        protocol: "v1",
        scope: "",
        nonce: sodium.to_base64(sodium.randombytes_buf(32)),
        record_type: "genesis",
        data: {
            name: "Trust Architect Core",
            key: await Key.getPublicFromPrivate(keys.masterPrivateKey),
            js_at: Date.now(),
        },
        signatures: [],
    };

    const signedGenesisRhex = await Key.sign(
        genesisRhex,
        "owner",
        keys.masterPrivateKey
    );
    const usherSignedGenesisRhex = await Usher.sign(
        signedGenesisRhex,
        "",
        keys.masterPrivateKey
    );
    //console.dir(usherSignedGenesisRhex, { depth: null });
    console.log(JSON.stringify(usherSignedGenesisRhex, null, 2));
    await Ledger.append(usherSignedGenesisRhex);

    // *** Root policy set
    const policySetRhex = {
        protocol: "v1",
        scope: "",
        nonce: sodium.to_base64(sodium.randombytes_buf(32)),
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
        signatures: [],
    };
    const signedPolicySetRhex = await Key.sign(
        policySetRhex,
        "owner",
        keys.masterPrivateKey
    );
    const usherSignedPolicySetRhex = await Usher.sign(
        signedPolicySetRhex,
        usherSignedGenesisRhex.current_hash,
        keys.masterPrivateKey
    );
    //console.dir(usherSignedPolicySetRhex, { depth: null });
    console.log(JSON.stringify(usherSignedPolicySetRhex, null, 2));
    await Ledger.append(usherSignedPolicySetRhex);

    // *** Keymaster key:grant
    const keymasterSetRhex = {
        protocol: "v1",
        scope: "",
        nonce: sodium.to_base64(sodium.randombytes_buf(32)),
        record_type: "key:grant",
        data: {
            schema: "key.grant/1",
            name: "Trust Architect Keymaster",
            key: sodium.to_base64(keys.keymasterPublic),
        },
        signatures: [],
    };
    const signedKeymasterRhex = await Key.sign(
        keymasterSetRhex,
        "owner",
        keys.masterPrivateKey
    );
    const usherSignedKeymasterRhex = await Usher.sign(
        signedKeymasterRhex,
        usherSignedPolicySetRhex.current_hash,
        keys.masterPrivateKey
    );
    // console.dir(usherSignedKeymasterRhex, { depth: null });
    console.log(JSON.stringify(usherSignedKeymasterRhex, null, 2));
    await Ledger.append(usherSignedKeymasterRhex);

    // *** Scope:create
    const scopeCreateRhex = {
        protocol: "v1",
        scope: "",
        nonce: sodium.to_base64(sodium.randombytes_buf(32)),
        record_type: "scope:create",
        data: {
            schema: "scope.create/1",
            scope: "self",
            description: "Scope for sovereign identities",
            ushers: [
                { ipAddress: "34.71.60.51", port: 1984 },
                { ipAddress: "34.71.60.51", port: 3000 },
                { ipAddress: "34.71.60.51", port: 3001 },
                { ipAddress: "34.71.60.51", port: 3002 },
                { ipAddress: "34.71.60.51", port: 3003 },
            ],
            keys: {
                fingerprint: await Key.getPublicFromPrivate(
                    keys.keymasterPrivate
                ),
                roles: ["authority", "quorum"],
            },
            created_at: Time.gtToString(Time.unixMsToGT(Date.now())),
            created_by: "Trust Architect Core",
        },
        signatures: [],
    };
    const signedScopeCreateRhex = await Key.sign(
        scopeCreateRhex,
        "owner",
        keys.keymasterPrivate
    );
    const usherSignedScopeCreateRhex = await Usher.sign(
        signedScopeCreateRhex,
        usherSignedKeymasterRhex.current_hash,
        keys.keymasterPrivate
    );
    // console.dir(usherSignedScopeCreateRhex, { depth: null });
    console.log(JSON.stringify(usherSignedScopeCreateRhex, null, 2));
    await Ledger.append(usherSignedScopeCreateRhex);

    // *** Scope:genesis of "self" scope
    const scopeGenesisSelf = {
        protocol: "v1",
        scope: "self",
        nonce: sodium.to_base64(sodium.randombytes_buf(32)),
        record_type: "scope:genesis",
        data: {
            schema: "scope.genesis/1",
            keys: {
                fingerprint: await Key.getPublicFromPrivate(
                    keys.keymasterPrivate
                ),
                roles: ["authority", "quorum"],
            },
        },
        signatures: [],
    };
    const signedScopeGenesisSelf = await Key.sign(
        scopeGenesisSelf,
        "owner",
        keys.keymasterPrivate
    );
    const usherSignedScopeGenesisSelf = await Usher.sign(
        signedScopeGenesisSelf,
        usherSignedScopeCreateRhex.current_hash,
        keys.keymasterPrivate
    );
    // console.dir(usherSignedScopeGenesisSelf, { depth: null });
    console.log(JSON.stringify(usherSignedScopeGenesisSelf, null, 2));
    await Ledger.append(usherSignedScopeGenesisSelf);

    // *** Self policy set
    const selfPolicySetRhex = {
        protocol: "v1",
        scope: "self",
        nonce: sodium.to_base64(sodium.randombytes_buf(32)),
        record_type: "policy:set",
        data: {
            schema: "policy.set/1",
            write: ["authority", "owner"],
            read: ["any"],
            mirror: ["any"],
            grant: ["authority", "owner"],
            revoke: ["authority", "owner"],
            allow_records: ["identity:*", "scope:*", "assert:*"],
            deny_records: ["all"],
            quorum: {
                write: 1,
                grant: 1,
                revoke: 2,
            },
        },
        signatures: [],
    };
    const signedSelfPolicySet = await Key.sign(
        selfPolicySetRhex,
        "owner",
        keys.keymasterPrivate
    );
    const usherSignedSelfPolicySet = await Usher.sign(
        signedSelfPolicySet,
        usherSignedScopeGenesisSelf.current_hash,
        keys.keymasterPrivate
    );
    //console.dir(usherSignedSelfPolicySet, { depth: null });
    console.log(JSON.stringify(usherSignedSelfPolicySet, null, 2));
    await Ledger.append(usherSignedSelfPolicySet);

    // *** Scope:create of my SelfID scope
    const scopeCreateSelf = {
        protocol: "v1",
        scope: "self",
        nonce: sodium.to_base64(sodium.randombytes_buf(32)),
        record_type: "scope:create",
        data: {
            schema: "scope.create/1",
            scope: "self.0000-0000-0000-0000",
            description: "Scope for SelfID 0000-0000-0000-0000",
            ushers: [
                { ipAddress: "34.71.60.51", port: 1984 },
                { ipAddress: "34.71.60.51", port: 3000 },
                { ipAddress: "34.71.60.51", port: 3001 },
                { ipAddress: "34.71.60.51", port: 3002 },
                { ipAddress: "34.71.60.51", port: 3003 },
            ],
            keys: [
                {
                    fingerprint: await Key.getPublicFromPrivate(
                        keys.keymasterPrivate
                    ),
                    roles: ["authority", "quorum"],
                },
            ],
            created_at: Time.gtToString(Time.unixMsToGT(Date.now())),
            created_by: "Veronica Hodo <0000-0000-0000-0000>",
        },
        signatures: [],
    };
    const signedScopeCreateSelf = await Key.sign(
        scopeCreateSelf,
        "owner",
        keys.keymasterPrivate
    );
    const usherSignedScopeCreateSelf = await Usher.sign(
        signedScopeCreateSelf,
        "",
        keys.keymasterPrivate
    );
    // console.dir(usherSignedScopeCreateSelf, { depth: null });
    console.log(JSON.stringify(usherSignedScopeCreateSelf, null, 2));
    await Ledger.append(usherSignedScopeCreateSelf);

    // *** Identity:claim for my SelfID
    const selfCreateRhex = {
        protocol: "v1",
        scope: "self",
        nonce: sodium.to_base64(sodium.randombytes_buf(32)),
        record_type: "identity:claim",
        data: {
            schema: "identity.claim/1",
            name_given: "Veronica",
            name_family: "Hodo",
            name_display: "Veronica Hodo",
            at: Time.gtToString(Time.unixMsToGT(Date.now())),
        },
        signatures: [],
    };
    const signedSelfCreateRhex = await Key.sign(
        selfCreateRhex,
        "owner",
        keys.keymasterPrivate
    );
    const usherSignedSelfCreateRhex = await Usher.sign(
        signedSelfCreateRhex,
        usherSignedSelfPolicySet.current_hash,
        keys.keymasterPrivate
    );
    // console.dir(usherSignedSelfCreateRhex, { depth: null });
    console.log(JSON.stringify(usherSignedSelfCreateRhex, null, 2));
    await Ledger.append(usherSignedSelfCreateRhex);
};
