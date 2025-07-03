import { Log } from "../tools/logger.js";

export const handleError = async (unit, req, message, res) => {
    await Log.error(unit, message, req.user.u);
};
