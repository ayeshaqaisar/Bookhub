import "dotenv/config";
import express from "express";
import cors from "cors";
import { getConfig } from "./lib/config";
import { logger } from "./lib/logger";
import { authMiddleware } from "./lib/auth-middleware";
import { registerAllRoutes } from "./routes";

/**
 * Create Express application with middleware and route handlers
 * Configuration is validated early to fail fast in production
 */
export function createServer() {
  // Validate configuration early - fails immediately if env vars are invalid
  const config = getConfig();
  logger.logSuccess('Configuration validated successfully', {
    env: config.nodeEnv,
    logLevel: config.logLevel,
    corsOrigins: Array.isArray(config.corsOrigins) ? config.corsOrigins.join(', ') : config.corsOrigins,
  });

  const app = express();

  // ============ MIDDLEWARE ============

  // CORS with explicit origin configuration
  const isOpenCors = Array.isArray(config.corsOrigins) && config.corsOrigins.length === 1 && config.corsOrigins[0] === '*';
  const corsOptions = {
    origin: Array.isArray(config.corsOrigins) ? config.corsOrigins.join(', ') : config.corsOrigins,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-supabase-api-version'],
  credentials: true,
  };

  app.use(cors(corsOptions));
  app.use(express.json({ limit: "100mb" }));
  app.use(express.urlencoded({ extended: true, limit: "100mb" }));
  app.use(authMiddleware);

  // ============ ROUTE REGISTRATION ============
  // All routes are organized in server/routes/index.ts
  // Provides clean separation between server setup and route configuration
  registerAllRoutes(app, config.enableLegacyRoutes);

  logger.logSuccess('Server initialized successfully', {
    nodeEnv: config.nodeEnv,
    legacyRoutesEnabled: config.enableLegacyRoutes,
  });

  return app;
}
