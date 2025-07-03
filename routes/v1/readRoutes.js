import express from "express";
import { getRead } from "../../controllers/v1/readController.js";

const router = express.Router();

router.get("/", getRead);

export default router;
