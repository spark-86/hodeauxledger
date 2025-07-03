import express from "express";
import { validateAppend } from "../../validators/v1/validateAppend.js";
import { postAppend } from "../../controllers/v1/appendController.js";

const router = express.Router();

router.post("/", validateAppend, postAppend);

export default router;
