import express from "express";
import { getPreviousHash } from "../../controllers/v1/getController";

const router = express.Router();

router.get("/:scope", getPreviousHash);

export default router;
