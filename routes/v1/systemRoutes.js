import express from "express";
import { postSystemRecord } from "../../controllers/v1/systemController.js";

const router = express.Router();

router.post("/root/add", postSystemRecord);

export default router;
