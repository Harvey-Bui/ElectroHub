import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import type { AppConfig } from './config.js';
import type { RedisClient } from './db/redis.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { createRepositories, type Repositories } from './repositories/index.js';
import type { PingableStore } from './routes/health.js';
import { createApiRouter } from './routes/index.js';
import { createServices, type Services } from './services/index.js';

export interface AppOptions {
  config: AppConfig;
  redis: RedisClient;
  /** Override the health-check target (tests use a stub to simulate Redis being down). */
  health?: PingableStore;
}

export interface AppContainer {
  app: Express;
  repos: Repositories;
  services: Services;
}

/**
 * Wires repositories → services → controllers/routes around one Redis client
 * and returns the Express app (without listening), so tests can drive it with
 * Supertest against an isolated Redis key prefix.
 */
export function buildApp({ config, redis, health }: AppOptions): AppContainer {
  const repos = createRepositories(redis, config);
  const services = createServices(repos, config);

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy);
  app.use(helmet());
  app.use(cors({ origin: config.corsOrigins, credentials: true }));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser(config.security.cookieSecret));

  app.use(
    '/api',
    createApiRouter({ services, health: health ?? redis, security: config.security }),
  );

  app.use(notFoundHandler);
  app.use(errorHandler);

  return { app, repos, services };
}

export function createApp(options: AppOptions): Express {
  return buildApp(options).app;
}
