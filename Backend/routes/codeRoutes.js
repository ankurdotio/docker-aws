import express from "express";
import { execute } from "../controller/executeController.js";

const router = express.Router();

router.post("/execute", execute);

export default router;
