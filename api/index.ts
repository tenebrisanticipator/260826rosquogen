import path from "node:path";
import { createProductionApp } from "../server/app";

process.env.STATIC_DIR ??= path.resolve(process.cwd(), "dist", "public");

export default createProductionApp();
