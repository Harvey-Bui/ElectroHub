/* eslint-disable no-console */
/**
 * npm run admin:create
 * Creates the administrator account (or rotates its password) from
 * ADMIN_USERNAME and ADMIN_PASSWORD in .env. Only an scrypt hash is stored in
 * Redis; the password itself is never printed or saved anywhere else.
 */
import { loadConfig } from '../src/config.js';
import { closeRedis, describeError, getRedisClient } from '../src/db/redis.js';
import { createRepositories } from '../src/repositories/index.js';
import { createServices } from '../src/services/index.js';
import { MIN_ADMIN_PASSWORD_LENGTH } from '../src/services/authService.js';

async function main() {
  const username = process.env.ADMIN_USERNAME?.trim();
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password) {
    console.error(
      'Set ADMIN_USERNAME and ADMIN_PASSWORD in .env (password: at least ' +
        `${MIN_ADMIN_PASSWORD_LENGTH} characters), then run: npm run admin:create`,
    );
    process.exitCode = 1;
    return;
  }

  const config = loadConfig();
  const client = await getRedisClient(config.redis);
  const services = createServices(createRepositories(client, config), config);
  const { created } = await services.auth.createAdmin(username, password);
  console.log(
    created
      ? `Created administrator "${username.toLowerCase()}".`
      : `Updated the password of administrator "${username.toLowerCase()}".`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(`admin:create failed: ${describeError(error)}`);
    process.exitCode = 1;
  })
  .finally(closeRedis);
