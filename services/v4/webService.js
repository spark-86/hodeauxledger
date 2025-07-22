import { Disk } from "./diskService.js";
import { Usher } from "./usherService.js";
import sodium from "libsodium-wrappers-sumo";

export const webAppend = async (req, res) => {
    const { protocol, scope, nonce, record_type, data, signatures } = req.body;
    const usherHotKey = await Disk.loadKey("usher", "hot");
    const tip = await Disk.getTip(scope);

    const record = {
        protocol,
        scope,
        nonce,
        record_type,
        data,
        signatures,
    };
    const decoded = Buffer.from(usherHotKey.key, "base64").toString("utf8");
    console.log(decoded);
    console.log(decoded.length);
    const key = Buffer.from(decoded, "base64").toString("utf8");
    console.log(key.length);

    const usherSigned = await Usher.sign(
        record,
        tip === "genesis" ? "" : tip,
        key
    );

    console.dir(usherSigned, { depth: null });
};
