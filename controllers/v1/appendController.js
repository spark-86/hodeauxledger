import { Disk } from "../../services/v4/diskService.js";
import { Key } from "../../services/v4/keyService.js";
import { Ledger } from "../../services/v4/ledgerService.js";
import { Usher } from "../../services/v4/usherService.js";

export const postAppend = async (req, res) => {
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
        console.log("Attempted to submit unverifiable R⬢");
        console.dir(submittedRecord, { depth: null });
        return res.status(400).json({ message: "R⬢ did not validate" });
    }

    // See what is required to read from the scope

    // Send out for quorum

    // Process if necessary

    // Write to ledger
    const tip = await Disk.getTip(submittedRecord.scope);
    const usherHotKey = await Disk.loadKey("usher", "hot");
    if (!usherHotKey) {
        console.log("Could not load usher hot key");
        return res.status(500).json({ message: "Could not sign message" });
    }
    console.log(tip);
    const usherSigned = await Usher.sign(submittedRecord, tip, usherHotKey.key);
    console.dir(usherSigned, { depth: null });
    await Ledger.append(usherSigned);
    return res.status(201).json({ data: usherSigned });
    try {
    } catch (err) {
        console.error(`Error: ${err}`);
        return res.status(500).json({ message: err.message });
    }
};

const processRecord = async (record) => {
    const parts = record.record_type.split(":");

    switch (parts[0]) {
        case "scope":
    }
};
