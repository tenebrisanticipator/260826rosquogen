import type { Request, Response } from "express";
import { createProductionApp } from "./app.js";

const app = createProductionApp();

export default function handler(req: Request, res: Response) {
  const requestUrl = new URL(req.url ?? "/", "http://vercel.local");
  const originalPath = requestUrl.searchParams.get("__path");

  if (originalPath?.startsWith("/api/")) {
    requestUrl.searchParams.delete("__path");
    req.url = `${originalPath}${requestUrl.search}`;
  } else if (!req.url?.startsWith("/api") && !req.url?.startsWith("/manus-storage")) {
    req.url = `/api${req.url?.startsWith("/") ? "" : "/"}${req.url ?? ""}`;
  }

  return app(req, res);
}

