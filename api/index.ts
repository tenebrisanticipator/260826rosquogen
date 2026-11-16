import path from "node:path";
import type { Request, Response } from "express";
import { createProductionApp } from "../server/app.js";

process.env.STATIC_DIR ??= path.resolve(process.cwd(), "dist", "public");

const app = createProductionApp();

export default function handler(req: Request, res: Response) {
  const requestUrl = new URL(req.url ?? "/", "http://vercel.local");
  const originalPath = requestUrl.searchParams.get("__path");

  if (originalPath?.startsWith("/api/")) {
    requestUrl.searchParams.delete("__path");
    req.url = `${originalPath}${requestUrl.search}`;
  }

  return app(req, res);
}
