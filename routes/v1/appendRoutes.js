import express from "express";
import { webAppend } from "../../services/v4/webService.js";

const router = express.Router();

router.post("/", webAppend);

export default router;
