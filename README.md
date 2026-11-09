# ElectroHub

**NoSQL-powered electronics e-commerce platform.** Redis is ElectroHub's primary database,
not a cache: products, shopping carts, inventory and orders are stored in Redis 7 with
persistence (AOF and RDB) turned on.

| Layer    | Technology                                                 |
| -------- | ---------------------------------------------------------- |
| Frontend | React 19, Vite 8, TypeScript, Tailwind CSS 4, React Router |
| Backend  | Node.js, Express 5, TypeScript, Zod                        |
| Database | Redis 7 Community Edition (official `redis` Node client)   |
| Testing  | Vitest, Supertest, Testing Library                         |
| Tooling  | ESLint (flat config), Prettier, Docker Compose             |

> Status: **project foundation only.** The API exposes `GET /api/health`, which checks
> Redis for real. Product, cart, inventory and order features are not implemented yet.

---

## Prerequisites

- **Node.js 22.12 or newer** (see `.nvmrc`; developed on Node 24)
- **npm 10 or newer**
- **Docker Desktop** (or any Docker Engine with Compose v2), used to run Redis

## Quick start

```bash
# 1. Configure the environment (one shared .env at the repo root)
cp .env.example .env

# 2. Start Redis 7
docker compose up -d redis

# 3. Install dependencies (the server and client are independent packages)
npm --prefix server install
npm --prefix client install

# 4. Run the API: http://localhost:4000/api/health
npm --prefix server run dev

# 5. In a second terminal, run the web app: http://localhost:5173
npm --prefix client run dev
```

The root `package.json` only has shortcuts for these commands (`npm run db:up`,
`npm run dev:server`, `npm run dev:client`, `npm test`, …). It has no dependencies of its own.

## Project structure

```
electrohub/
├── docker-compose.yml        Redis 7 with persistence (AOF everysec + RDB) and a healthcheck
├── .env.example              All environment variables (server, client, compose)
├── server/                   Express API (independent npm package)
│   ├── src/
│   │   ├── config.ts         Loads and validates env vars with Zod (fails fast)
│   │   ├── index.ts          Entry point: connects to Redis, starts HTTP, shuts down cleanly
│   │   ├── app.ts            createApp(): Express app factory with injected dependencies
│   │   ├── db/
│   │   │   ├── redis.ts      Client factory, connect (fail-fast) and reconnect policy
│   │   │   └── keys.ts       Single source of truth for the Redis key schema
│   │   ├── repositories/     Redis data access, one module per aggregate
│   │   ├── services/         Business rules (stock checks, checkout, …)
│   │   ├── routes/           HTTP routers mounted under /api
│   │   ├── middleware/       Error handling, request validation
│   │   ├── schemas/          Zod request/response schemas
│   │   └── lib/              Logger, HttpError
│   └── tests/                Vitest + Supertest (unit and Redis integration)
└── client/                   React SPA (independent npm package)
    ├── vite.config.ts        Dev proxy /api → server, Vitest config
    ├── tailwind.config.ts    Design tokens (loaded through @config in index.css)
    └── src/
        ├── api/              Typed fetch wrapper and one module per resource
        ├── components/       Reusable UI
        ├── pages/            Route-level views
        ├── store/            Client state (cart and session, coming later)
        └── styles/           Tailwind entry point
```

### Layering (server)

```
routes  →  services  →  repositories  →  Redis
 (HTTP)    (business)    (keys + commands)
```

- **Routes** parse and validate input with Zod schemas and call services. They never touch Redis.
- **Services** hold the business rules and use `MULTI`/`WATCH` or Lua scripts for operations
  that must be atomic, such as reserving stock during checkout.
- **Repositories** are the only code that builds Redis keys (through `db/keys.ts`) and sends commands.
- `createApp()` receives its dependencies as arguments, so tests can inject them.

### Redis data model (planned)

Every key starts with the `REDIS_KEY_PREFIX` value (default `electrohub:`).

| Key                        | Type       | Purpose                                                |
| -------------------------- | ---------- | ------------------------------------------------------ |
| `product:{id}`             | Hash       | Product fields                                         |
| `products:all`             | Sorted set | Product ids by creation time (pagination)              |
| `products:category:{slug}` | Set        | Category index                                         |
| `inventory:{productId}`    | String/int | Stock level, changed atomically with `DECRBY`/`INCRBY` |
| `cart:{cartId}`            | Hash       | productId → quantity                                   |
| `order:{id}`               | Hash       | Order header                                           |
| `order:{id}:items`         | List       | Line items captured at checkout                        |
| `orders:all`               | Sorted set | Order ids by creation time                             |
| `seq:{name}`               | String/int | Id sequences (`INCR`)                                  |

## Environment variables

Both packages and Docker Compose read the **repository-root `.env`** file. The server also
reads `server/.env` when that file exists. Only variables prefixed with `VITE_` are sent to
the browser.

| Variable                    | Default                  | Used by                  |
| --------------------------- | ------------------------ | ------------------------ |
| `NODE_ENV`                  | `development`            | server                   |
| `PORT`                      | `4000`                   | server                   |
| `CORS_ORIGIN`               | `http://localhost:5173`  | server (comma-separated) |
| `REDIS_URL`                 | `redis://localhost:6379` | server                   |
| `REDIS_PASSWORD`            | _(empty)_                | server, compose          |
| `REDIS_KEY_PREFIX`          | `electrohub:`            | server                   |
| `REDIS_PORT`                | `6379`                   | compose (host port)      |
| `VITE_API_BASE_URL`         | _(empty = same origin)_  | client                   |
| `VITE_DEV_API_PROXY_TARGET` | `http://localhost:4000`  | client dev server        |

## Scripts

Both `server/` and `client/` have these scripts:

| Script                            | Description                                  |
| --------------------------------- | -------------------------------------------- |
| `npm run dev`                     | Dev server with reload on change             |
| `npm run build`                   | Production build (`dist/`)                   |
| `npm start` / `npm run preview`   | Run the build (server) / preview it (client) |
| `npm run typecheck`               | `tsc` without emitting files                 |
| `npm run lint` / `lint:fix`       | ESLint                                       |
| `npm run format` / `format:check` | Prettier                                     |
| `npm test` / `test:watch`         | Vitest                                       |

### Tests

- `server/tests/app.test.ts`: HTTP behaviour through Supertest (health, 404, bad JSON, CORS).
- `server/tests/redis.integration.test.ts`: runs against a **real Redis**. It is skipped
  automatically when Redis is unreachable. Set `REQUIRE_REDIS=1` (for example in CI) to make
  a missing Redis fail the run instead.
- `client/src/**/*.test.ts(x)`: API client and component tests (jsdom).

## Team workflow (3 members)

- `main` is always releasable. Create feature branches such as `feat/products-api`,
  `feat/cart`, `feat/orders-checkout`, and open a pull request for review.
- Before you push, run `npm run lint && npm run typecheck && npm test` from the repo root.
- Suggested split: (1) catalogue and inventory, (2) cart and checkout/orders, (3) frontend
  pages and state. Coordinate any change to `server/src/db/keys.ts`, because every feature
  depends on it.

## Troubleshooting

**"An Application Control policy has blocked this file" / "Cannot find native binding" (Windows)**
Windows Smart App Control blocks native `.node` binaries that have no reputation yet. It
blocked the `rolldown` binary used by Vite 8 and Vitest 5 version 1.2.18 on the machine
this project was set up on. To work around it, both `package.json` files pin
`vite@8.3.6` and `rolldown@1.2.16` through `overrides`. That combination is supported
upstream, and its binary loads on that machine. Once newer binaries load on every team
member's machine, you can remove the `overrides` blocks (and the exact `vite` pin in
`client/package.json`), then reinstall.

**Server exits with "Unable to connect to Redis"**
The API connects to Redis when it starts and exits on failure, after about 5 retries.
Start Redis with `docker compose up -d redis` and check that it is healthy with
`docker compose ps`.
