import express from "express";
import { getPreviousHash } from "../../controllers/v1/getController.js";

const router = express.Router();

router.get("/:scope", getPreviousHash);
router.get("/", getPreviousHash);

export default router;
