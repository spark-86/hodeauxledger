import express from "express";
import { webTip } from "../../services/v2/webServices.js";

const router = express.Router();

router.post("/:scope", webTip);
router.post("/", webTip);

export default router;
