import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { closeRedis, describeError, getRedisClient } from './db/redis.js';
import { logger } from './lib/logger.js';

async function main(): Promise<void> {
  const config = loadConfig();

  let redis;
  try {
    redis = await getRedisClient(config.redis);
  } catch (error) {
    logger.error(
      `[startup] ${describeError(error)}. Is Redis running? Try \`docker compose up -d redis\`.`,
    );
    process.exit(1);
  }

  const app = createApp({ config, redis });
  const server = app.listen(config.port, () => {
    logger.info(`[server] ElectroHub API listening on http://localhost:${config.port}`);
  });

  let shuttingDown = false;
  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`[server] ${signal} received, closing HTTP server and Redis connection...`);
    // Force-exit if connections do not drain in time
    setTimeout(() => process.exit(1), 10_000).unref();
    server.close(() => {
      closeRedis()
        .catch((error: unknown) =>
          logger.error('[redis] error during close:', describeError(error)),
        )
        .finally(() => process.exit(0));
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((error: unknown) => {
  logger.error('[startup] Fatal error:', error);
  process.exit(1);
});
