import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import type { AppConfig } from './config.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { createApiRouter, type RouteDependencies } from './routes/index.js';

export interface AppOptions extends RouteDependencies {
  config: Pick<AppConfig, 'corsOrigins'>;
}

/**
 * Builds the Express application without starting a listener, so tests can
 * drive it with Supertest and inject their own dependencies.
 */
export function createApp({ config, ...deps }: AppOptions): Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: config.corsOrigins, credentials: true }));
  app.use(express.json({ limit: '100kb' }));

  app.use('/api', createApiRouter(deps));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
