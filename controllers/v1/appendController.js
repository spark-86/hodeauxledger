import chalk from "chalk";
import { Cache } from "../../services/v4/cacheService.js";
import { Disk } from "../../services/v4/diskService.js";
import { Key } from "../../services/v4/keyService.js";
import { Ledger } from "../../services/v4/ledgerService.js";
import { Usher } from "../../services/v4/usherService.js";
import { loadConfig } from "../../tools/v4/config.js";
import { Handler } from "../../handlers/v1/handler.js";
import { Scope } from "../../services/v4/scopeService.js";

export const postAppend = async (req, res) => {
    const config = loadConfig();
    console.dir(req.body, { depth: null });
    const { protocol, scope, nonce, record_type, data, signatures } = req.body;

    const submittedRecord = {
        protocol,
        scope,
        nonce,
        record_type,
        data,
        signatures,
    };
    const verified = await Key.verify(submittedRecord, "owner");
    if (!verified) {
        s;
        console.log("Attempted to submit unverifiable R⬢");
        console.dir(submittedRecord, { depth: null });
        return res.status(400).json({ message: "R⬢ did not validate" });
    }
    if (config.verbose) console.log("Verified R⬢");

    // See if we can even submit this record.
    const ownerFingerprint = submittedRecord.signatures.find(
        (sig) => sig.type === "owner"
    );
    if (!ownerFingerprint) {
        console.log("No owner signature found on R⬢");
        return res.status(400).json({ message: "No owner signature found" });
    }
    if (submittedRecord.record_type === "request") {
        const canRead = await Scope.canRead(
            ownerFingerprint.fingerprint,
            scope
        );
        if (!canRead) {
            console.log("No read permission for this scope");
            return res.status(403).json({ message: "No read permission" });
        }
    } else {
        const canAppend = await Scope.canAppend(
            ownerFingerprint.fingerprint,
            scope
        );
        if (!canAppend) {
            console.log("No append permission for this scope");
            return res.status(403).json({ message: "No append permission" });
        }
    }

    // Send out for quorum

    // Process if necessary
    if (submittedRecord.record_type !== "request")
        await Handler.process(usherSigned);

    // Write to ledger, if we are supposed to
    if (submittedRecord.record_type !== "request") {
        if (config.verbose) console.log("Writing to ledger");
        const tip = await Disk.getTip(submittedRecord.scope);
        const usherHotKey = await Disk.loadKey("usher", "hot");
        if (!usherHotKey) {
            console.log("Could not load usher hot key");
            return res.status(500).json({ message: "Could not sign message" });
        }
        console.log(tip);
        const usherSigned = await Usher.sign(
            submittedRecord,
            tip,
            usherHotKey.key
        );
        console.log(
            chalk.blackBright(
                "Appended R⬢ with hash: " + usherSigned.current_hash
            )
        );
        await Ledger.append(usherSigned);
        return res.status(201).json({ data: usherSigned });
    } else {
        const data = await Cache.getScope(submittedRecord.scope);
        return res.status(200).json({ data });
    }
};

const processRecord = async (record) => {
    const parts = record.record_type.split(":");

    switch (parts[0]) {
        case "scope":
    }
};
