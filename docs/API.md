# ElectroHub REST API

Base URL in development is `http://localhost:4000/api`. The Vite dev server
(`http://localhost:5173`) forwards `/api` to it, so the web app calls the API on its own
origin. Every endpoint reads from and writes to Redis; none of them return hard-coded data.

- [Conventions](#conventions)
- [Authentication and cookies](#authentication-and-cookies)
- [Catalogue](#catalogue): categories and products
- [Cart](#cart)
- [Checkout and orders](#checkout-and-orders)
- [Administration](#administration)
- [Error codes](#error-codes)

---

## Conventions

| Topic            | Rule                                                                                                                                               |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Content type     | Request and response bodies are JSON. Send `Content-Type: application/json`.                                                                       |
| Body size        | 100 kB maximum (`413 PAYLOAD_TOO_LARGE`).                                                                                                          |
| Money            | Integer **cents** everywhere (`priceCents: 189900` is $1,899.00). There are no floats.                                                             |
| IDs              | Products use a slug (`apple-mac-mini-m4`). Orders look like `ord_000001`. Customers look like `cus_…`.                                             |
| Timestamps       | ISO 8601 UTC strings.                                                                                                                              |
| Single resources | `{ "data": { … } }`                                                                                                                                |
| Collections      | `{ "data": [ … ], "pagination": { "page", "limit", "total", "totalPages" } }`                                                                      |
| Pagination       | `?page=` (from 1, default 1) and `?limit=` (1–100, default 20).                                                                                    |
| Errors           | `{ "error": { "code": "ERROR_CODE", "message": "Human-readable message", "details"?: … } }`                                                        |
| Validation       | Every body, query string and route parameter is checked with Zod. Failures return `400 VALIDATION_ERROR`, with `details: [{ "path", "message" }]`. |

Example validation error:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [{ "path": "priceCents", "message": "Too small: expected number to be >=0" }]
  }
}
```

## Authentication and cookies

| Cookie        | Set by                                                     | Purpose                                                                              | Flags                                                                                                             |
| ------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `eh_customer` | Any cart, checkout or order endpoint, on the first request | Anonymous shopper ID (`cus_` + 24 hex characters). There is no customer login in v1. | `HttpOnly`, signed, `SameSite=Lax`, `Path=/api`, 1 year, `Secure` in production                                   |
| `eh_admin`    | `POST /api/admin/login`                                    | Admin session token                                                                  | `HttpOnly`, signed, `SameSite=Strict`, `Path=/api/admin`, 8 h (`ADMIN_SESSION_TTL_HOURS`), `Secure` in production |

- **Cookie signing:** both cookies are signed with `COOKIE_SECRET`. A cookie that is
  missing, unsigned or edited is ignored: the shopper gets a new ID, and an admin gets `401`.
- **Admin sessions:** each session lives in Redis at `session:admin:{sha256(token)}` and
  expires through a TTL. Logging out deletes that key. The raw token exists only in the
  cookie.
- **Admin passwords:** stored as scrypt hashes in `admin:{username}`. No response ever
  includes a password or hash.
- **Login lockout:** after `ADMIN_LOGIN_MAX_ATTEMPTS` (default 5) failed logins from one
  IP within `ADMIN_LOGIN_WINDOW_MINUTES` (default 15), login returns `429` with a
  `Retry-After` header. The counter is kept in `ratelimit:admin-login:{ip}`.
- **Browser requests:** call the API with `credentials: 'include'` so cookies are sent.
  CORS only allows the origins listed in `CORS_ORIGIN`.

Create the admin account once:

```bash
npm --prefix server run admin:create
```

This reads `ADMIN_USERNAME` and `ADMIN_PASSWORD` (12 or more characters) from `.env`.

---

## Catalogue

### `GET /api/categories`

Lists all 7 categories with live product counts (from `SCARD` on the category sets).

```json
{
  "data": [
    { "slug": "gaming-laptops", "name": "Gaming Laptops", "description": "…", "productCount": 3 },
    { "slug": "laptops", "name": "Laptops", "description": "…", "productCount": 3 }
  ]
}
```

### `GET /api/products`

Paginated product list.

| Query                            | Type                                                                                            | Description                                                   |
| -------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `category`                       | `gaming-laptops` \| `laptops` \| `pcs` \| `mice` \| `monitors` \| `headphones` \| `microphones` | Filter by category                                            |
| `brand`                          | string                                                                                          | Filter by brand, case-insensitive (`asus`, `Western Digital`) |
| `minPriceCents`, `maxPriceCents` | integer ≥ 0                                                                                     | Price range, inclusive. `min` must be ≤ `max`.                |
| `inStock`                        | `true` \| `false`                                                                               | Only products in stock, or only out-of-stock products         |
| `featured`                       | `true` \| `false`                                                                               | Only featured products                                        |
| `sort`                           | `newest` (default) \| `price-asc` \| `price-desc` \| `best-selling`                             | Sort order                                                    |
| `page`, `limit`                  | integer                                                                                         | Pagination                                                    |

`200` response:

```json
{
  "data": [
    {
      "id": "logitech-mx-master-3s",
      "name": "Logitech MX Master 3S",
      "brand": "Logitech",
      "brandSlug": "logitech",
      "category": "mice",
      "description": "Productivity mouse…",
      "priceCents": 9999,
      "stock": 55,
      "specs": { "sensor": "Darkfield 8K", "maxDpi": 8000, "wireless": true },
      "imageUrl": "https://placehold.co/…",
      "featured": false,
      "createdAt": "2026-10-12T09:00:00.000Z",
      "updatedAt": "2026-11-09T17:13:13.900Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 3, "totalPages": 1 }
}
```

Errors: `400 VALIDATION_ERROR` for an unknown `sort`, `category` or `inStock` value, a
negative price, `min > max`, or `limit > 100`.

### `GET /api/products/featured`

Featured products, newest first. Query: `limit` (1–50, default 8). Returns `{ data: Product[] }`.

### `GET /api/products/category/:category`

Same as `GET /api/products?category=:category`. It takes all the other filters, sorting
and pagination. A `category` in the query string is ignored.

Errors: `404 CATEGORY_NOT_FOUND` for an unknown slug.

### `GET /api/products/:id`

Returns `{ data: Product }`.

Errors: `404 PRODUCT_NOT_FOUND`, and `400 VALIDATION_ERROR` for a malformed ID (allowed
characters are `A–Z a–z 0–9 _ -`, up to 64).

---

## Cart

The cart belongs to the shopper identified by `eh_customer`, and the cookie is created on
first use. The server re-reads prices and stock from Redis on every request.

**Cart object** (returned by every cart endpoint except `DELETE /api/cart`):

```json
{
  "data": {
    "items": [
      {
        "productId": "sony-wh-1000xm5",
        "name": "Sony WH-1000XM5",
        "brand": "Sony",
        "category": "headphones",
        "imageUrl": "https://…",
        "unitPriceCents": 39999,
        "quantity": 2,
        "lineTotalCents": 79998,
        "stock": 22,
        "exceedsStock": false
      }
    ],
    "itemCount": 2,
    "subtotalCents": 79998,
    "shippingCents": 999,
    "totalCents": 80997,
    "hasStockIssues": false,
    "removedProductIds": []
  }
}
```

- **Shipping:** free when the subtotal is at least `FREE_SHIPPING_THRESHOLD_CENTS`
  (default $100). Otherwise it is `SHIPPING_FLAT_CENTS` (default $9.99).
- **`exceedsStock` and `hasStockIssues`:** these flag lines whose stock dropped after
  they were added. Checkout would fail until the quantity is lowered.
- **`removedProductIds`:** lines for products that were deleted from the catalogue. They
  are removed automatically and reported once.
- **Idle carts:** a cart expires after `CART_TTL_DAYS` (default 30) without changes.

| Method and path                     | Body                                                                                | Success    | Errors                                                                                                                                      |
| ----------------------------------- | ----------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/cart`                     | none                                                                                | `200` cart | none                                                                                                                                        |
| `POST /api/cart/items`              | `{ "productId": string, "quantity"?: 1–99 (default 1) }`. Adds to an existing line. | `201` cart | `400 VALIDATION_ERROR`, `404 PRODUCT_NOT_FOUND`, `409 OUT_OF_STOCK`, `409 INSUFFICIENT_STOCK` (`details: { requested, available, inCart }`) |
| `PUT /api/cart/items/:productId`    | `{ "quantity": 0–99 }`. Sets the exact quantity; `0` removes the line.              | `200` cart | `400`, `404 CART_ITEM_NOT_FOUND`, `404 PRODUCT_NOT_FOUND`, `409 INSUFFICIENT_STOCK`                                                         |
| `DELETE /api/cart/items/:productId` | none                                                                                | `200` cart | `404 CART_ITEM_NOT_FOUND`                                                                                                                   |
| `DELETE /api/cart`                  | none                                                                                | `204`      | none                                                                                                                                        |

The cart checks stock to give quick feedback, but it does **not** reserve anything.
Stock is taken, atomically, at checkout.

---

## Checkout and orders

### `POST /api/checkout`

Turns the shopper's cart into an order.

```json
{
  "email": "alex@example.com",
  "name": "Alex Nguyen",
  "phone": "+84 90 123 4567",
  "shippingAddress": {
    "line1": "12 Nguyen Hue",
    "line2": "Floor 3",
    "city": "Ho Chi Minh City",
    "region": "HCMC",
    "postalCode": "700000",
    "country": "VN"
  }
}
```

`phone`, `line2` and `region` are optional. `country` is an ISO 3166-1 alpha-2 code.

What the server does:

1. Reads the cart. If it is empty, returns `400 EMPTY_CART`.
2. Loads every product. If any were deleted, returns `409 PRODUCT_UNAVAILABLE` with
   `details: { productIds }`.
3. **Reserves stock atomically** with a Lua script that checks every line and then
   decrements them all. Either the whole cart is reserved or nothing is. If stock is
   short, returns `409 INSUFFICIENT_STOCK` with
   `details: { productId, requested, available }`, and both the cart and the stock stay
   unchanged.
4. Writes the order in one `MULTI` transaction: the order hash, the time, customer and
   status indexes, the revenue counter and best-seller ranking, and clearing the cart.
   Names and prices are snapshotted, so later catalogue edits don't change the order.
   If this write fails, the reserved stock is released.
5. Saves the shopper's contact details to `customer:{id}`.

`201` response, with `Location: /api/orders/{id}`:

```json
{
  "data": {
    "id": "ord_000001",
    "customerId": "cus_3a67e581ae66f7fedbaa2389",
    "status": "pending",
    "items": [
      {
        "productId": "lenovo-thinkpad-x1-carbon-gen12",
        "name": "Lenovo ThinkPad X1 Carbon Gen 12",
        "unitPriceCents": 189900,
        "quantity": 1
      }
    ],
    "itemCount": 1,
    "subtotalCents": 189900,
    "shippingCents": 0,
    "totalCents": 189900,
    "shippingAddress": {
      "line1": "1 Demo St",
      "city": "Hanoi",
      "postalCode": "100000",
      "country": "VN"
    },
    "contact": { "email": "demo@example.com", "name": "Demo Shopper" },
    "createdAt": "2026-11-09T17:53:45.120Z",
    "updatedAt": "2026-11-09T17:53:45.120Z"
  }
}
```

Other errors: `400 VALIDATION_ERROR`.

### `GET /api/orders`

The shopper's own orders, newest first and paginated. Returns `{ data: Order[], pagination }`.

### `GET /api/orders/:id`

Returns `{ data: Order }`. An order that belongs to someone else returns
`404 ORDER_NOT_FOUND`, the same as an order that doesn't exist, so order IDs can't be
probed. A malformed ID returns `400`.

### `POST /api/orders/:id/cancel`

The shopper cancels their own `pending` or `paid` order. It moves to `cancelled`, its
stock goes back to inventory, and its revenue and best-seller counts are reversed, all
atomically. If several cancel requests arrive at once, only one of them succeeds.

Returns `200 { data: Order }`.

Errors:

- `404 ORDER_NOT_FOUND`
- `409 ORDER_NOT_CANCELLABLE` once the order is `shipped`, `delivered` or already
  `cancelled` (`details: { status }`)
- `409 INVALID_STATUS_TRANSITION` if a concurrent request changed the status first

---

## Administration

Every endpoint below needs the `eh_admin` cookie, except `login` and `logout`. Without a
valid session they return `401 UNAUTHORIZED`. Admin responses carry
`Cache-Control: no-store`.

### `POST /api/admin/login`

Body: `{ "username": string, "password": string }`. The username is case-insensitive.

Returns `200 { data: { username, expiresAt } }` and sets `eh_admin`.

Errors:

- `400 VALIDATION_ERROR`
- `401 INVALID_CREDENTIALS`, with the same response whether the user is unknown or the
  password is wrong
- `429 TOO_MANY_REQUESTS`, with a `Retry-After` header and
  `details: { retryAfterSeconds }`

### `POST /api/admin/logout`

Deletes the session from Redis and clears the cookie. Returns `204`. It's safe to call
without a session.

### `GET /api/admin/me`

Returns `200 { data: { username, expiresAt } }` for the current session.

### `POST /api/admin/products`

Body: the full product.

```json
{
  "id": "razer-viper-v3-pro",
  "name": "Razer Viper V3 Pro",
  "brand": "Razer",
  "category": "mice",
  "description": "54 g wireless esports mouse.",
  "priceCents": 15999,
  "stock": 25,
  "specs": { "sensor": "Focus Pro 35K", "weightGrams": 54, "wireless": true },
  "imageUrl": "https://placehold.co/800x600/png?text=Viper",
  "featured": false
}
```

- `id` is optional. When it's omitted, the ID is a slug of `name`.
- `specs` defaults to `{}` and `featured` defaults to `false`.
- `specs` values may be strings, numbers, booleans, string arrays or `null`.

Returns `201 { data: Product }` with a `Location` header. All category, brand, featured,
price and inventory indexes are written in the same atomic step.

Errors: `400 VALIDATION_ERROR`, `409 PRODUCT_EXISTS`.

### `PUT /api/admin/products/:id`

Partial update. Send only the fields to change, and at least one. You can send any of
`name`, `brand`, `category`, `description`, `priceCents`, `specs`, `imageUrl`,
`featured`, plus `stock` (an absolute stock level, written through the inventory script
so the low-stock and out-of-stock indexes stay correct). Fields you leave out stay as
they are. If the category, brand, featured flag or price changes, the product is moved
between indexes atomically.

Returns `200 { data: Product }`.

Errors: `400 VALIDATION_ERROR` (including an empty body), `404 PRODUCT_NOT_FOUND`.

### `DELETE /api/admin/products/:id`

Removes the product, its inventory record and every index entry in one step. Returns `204`.

Errors: `404 PRODUCT_NOT_FOUND`.

### `GET /api/admin/orders`

All orders, newest first. Query: `status` (`pending` | `paid` | `shipped` | `delivered` |
`cancelled`), `page`, `limit`. Returns `{ data: Order[], pagination }`.

Errors: `400 VALIDATION_ERROR` for an unknown status.

### `GET /api/admin/orders/:id`

Returns any order: `200 { data: Order }`.

Errors: `404 ORDER_NOT_FOUND`.

### `PUT /api/admin/orders/:id/status`

Body: `{ "status": "paid" }`. Allowed transitions:

```
pending → paid | cancelled
paid    → shipped | cancelled
shipped → delivered
delivered, cancelled → (terminal)
```

Cancelling restocks the items and reverses revenue and best-seller counts atomically.

Returns `200 { data: Order }`.

Errors:

- `400 VALIDATION_ERROR`
- `404 ORDER_NOT_FOUND`
- `409 INVALID_STATUS_TRANSITION` with `details: { from, to, allowed }`

### `GET /api/admin/inventory/low-stock`

Products at or below `LOW_STOCK_THRESHOLD` (default 5), lowest stock first, read from the
`inventory:low-stock` sorted set. Query: `limit` (1–100, default 20).

```json
{
  "data": [
    {
      "productId": "msi-katana-15-b13v",
      "name": "MSI Katana 15 B13V",
      "brand": "MSI",
      "category": "gaming-laptops",
      "stock": 0,
      "priceCents": 109999
    },
    {
      "productId": "lenovo-thinkpad-x1-carbon-gen12",
      "name": "Lenovo ThinkPad X1 Carbon Gen 12",
      "brand": "Lenovo",
      "category": "laptops",
      "stock": 1,
      "priceCents": 189900
    }
  ]
}
```

### `GET /api/admin/dashboard`

A store overview built from Redis counters and indexes, with no keyspace scans.

```json
{
  "data": {
    "generatedAt": "2026-11-09T17:54:10.600Z",
    "catalog": { "products": 21, "byCategory": { "gaming-laptops": 3, "laptops": 3, "…": 3 } },
    "customers": 4,
    "orders": {
      "total": 1,
      "byStatus": { "pending": 0, "paid": 0, "shipped": 0, "delivered": 0, "cancelled": 1 },
      "revenueCents": 0,
      "averageOrderCents": 0
    },
    "inventory": {
      "trackedProducts": 21,
      "totalUnits": 298,
      "lowStock": 6,
      "outOfStock": 1,
      "lowStockThreshold": 5
    },
    "lowStock": [{ "productId": "msi-katana-15-b13v", "stock": 0, "…": "…" }],
    "topSellers": [{ "productId": "sony-wh-1000xm5", "name": "Sony WH-1000XM5", "unitsSold": 3 }],
    "recentOrders": [
      {
        "id": "ord_000001",
        "customerId": "cus_…",
        "status": "cancelled",
        "totalCents": 189900,
        "itemCount": 1,
        "createdAt": "…"
      }
    ]
  }
}
```

`revenueCents` is the total of all orders that are not cancelled.

### `GET /api/health`

Not authenticated. Returns `200` with `status: "ok"` when Redis answers `PING`, or `503`
with `status: "degraded"` when it doesn't.

---

## Error codes

| HTTP | `code`                      | When                                                                                 |
| ---- | --------------------------- | ------------------------------------------------------------------------------------ |
| 400  | `VALIDATION_ERROR`          | A body, query or route parameter failed Zod validation (see `details`)               |
| 400  | `BAD_JSON`                  | The body is not valid JSON                                                           |
| 400  | `EMPTY_CART`                | Checkout was called with an empty cart                                               |
| 401  | `UNAUTHORIZED`              | An admin endpoint was called without a valid session                                 |
| 401  | `INVALID_CREDENTIALS`       | The admin username or password is wrong                                              |
| 404  | `ROUTE_NOT_FOUND`           | No such endpoint                                                                     |
| 404  | `PRODUCT_NOT_FOUND`         | Unknown product ID                                                                   |
| 404  | `CATEGORY_NOT_FOUND`        | Unknown category slug                                                                |
| 404  | `CART_ITEM_NOT_FOUND`       | The product is not in the cart                                                       |
| 404  | `ORDER_NOT_FOUND`           | Unknown order ID, or another shopper's order                                         |
| 409  | `OUT_OF_STOCK`              | The product has 0 units                                                              |
| 409  | `INSUFFICIENT_STOCK`        | The requested quantity is more than the stock                                        |
| 409  | `PRODUCT_UNAVAILABLE`       | A product in the cart was deleted before checkout                                    |
| 409  | `PRODUCT_EXISTS`            | A product with this ID already exists                                                |
| 409  | `ORDER_NOT_CANCELLABLE`     | The shopper tried to cancel a shipped, delivered or cancelled order                  |
| 409  | `INVALID_STATUS_TRANSITION` | The order status change is not allowed                                               |
| 413  | `PAYLOAD_TOO_LARGE`         | The body is over 100 kB                                                              |
| 429  | `TOO_MANY_REQUESTS`         | Admin login is locked out (see `Retry-After`)                                        |
| 500  | `INTERNAL`                  | Unexpected server error. Details are logged on the server, never sent to the client. |

## Try it with curl

```bash
# Browse
curl -s "http://localhost:4000/api/products?category=mice&sort=price-asc"

# Shop (the cookie jar keeps the eh_customer cookie)
curl -s -c jar.txt -b jar.txt -H "Content-Type: application/json" \
  -d '{"productId":"sony-wh-1000xm5","quantity":1}' http://localhost:4000/api/cart/items
curl -s -c jar.txt -b jar.txt -H "Content-Type: application/json" \
  -d '{"email":"me@example.com","name":"Me","shippingAddress":{"line1":"1 Main St","city":"Hanoi","postalCode":"100000","country":"VN"}}' \
  http://localhost:4000/api/checkout

# Admin (use the password from your .env)
curl -s -c admin.txt -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"<ADMIN_PASSWORD>"}' http://localhost:4000/api/admin/login
curl -s -b admin.txt http://localhost:4000/api/admin/dashboard
```
