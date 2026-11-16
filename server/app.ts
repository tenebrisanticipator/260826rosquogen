import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./_core/oauth.js";
import { registerStorageProxy } from "./_core/storageProxy.js";
import { createContext } from "./_core/context.js";
import { appRouter } from "./routers.js";

/** Production Express application used by Vercel serverless functions. */
export function createProductionApp() {
  const app = express();
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  app.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext }));

  app.all("/api/*", (_req, res) => {
    res.status(404).json({ error: "API endpoint not found" });
  });

  return app;
}
