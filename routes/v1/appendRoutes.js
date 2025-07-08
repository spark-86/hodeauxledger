import express from "express";
import { webAppend } from "../../services/v2/webServices.js";

const router = express.Router();

router.post("/", webAppend);

export default router;
