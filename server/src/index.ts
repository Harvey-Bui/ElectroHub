import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { connectRedis, createRedisClient, describeError, disconnectRedis } from './db/redis.js';
import { logger } from './lib/logger.js';

async function main(): Promise<void> {
  const config = loadConfig();

  const redis = createRedisClient(config.redis);
  try {
    await connectRedis(redis);
  } catch (error) {
    logger.error(
      `[startup] ${describeError(error)}. ` + 'Is Redis running? Try `docker compose up -d redis`.',
    );
    process.exit(1);
  }

  const app = createApp({ config, redis });
  const server = app.listen(config.port, () => {
    logger.info(`[server] ElectroHub API listening on http://localhost:${config.port}`);
  });

  const shutdown = (signal: string) => {
    logger.info(`[server] ${signal} received, shutting down...`);
    server.close(() => {
      disconnectRedis(redis)
        .catch((error: unknown) => logger.error('[redis] error during quit:', error))
        .finally(() => process.exit(0));
    });
    // Force-exit if connections do not drain in time
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((error: unknown) => {
  logger.error('[startup] Fatal error:', error);
  process.exit(1);
});
