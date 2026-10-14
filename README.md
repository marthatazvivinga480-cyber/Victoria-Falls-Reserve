# Victoria Falls Reserve

**Discover Victoria Falls. Stay Exceptionally.**

A complete MERN student portfolio booking application for six fictional Victoria Falls hotels. React + TypeScript + Vite + Tailwind + React Router on the client; Express + TypeScript + MongoDB/Mongoose on the server. Original local vector illustrations and an ivory, charcoal, muted-green hospitality design. All hotels and payments are fictional.

## Quick start

Requires Node.js 22.12 or newer and npm. Extract the ZIP, open a terminal in `victoria-falls-reserve`, and run:

```sh
npm ci
```

For an instant local demo, run these in two terminals:

```sh
npm run dev:demo
npm run dev -w client
```

Open http://localhost:5173. Demo mode downloads a MongoDB binary on first use and starts a temporary replica set. It seeds the hotels and accounts automatically; data resets when stopped. It is a development helper, not a deployment mode.

For a persistent database, copy `server/.env.example` to `server/.env`, configure MongoDB Atlas or a local replica set, then:

```sh
npm run seed
npm run dev
```

The frontend proxy connects `/api` to port 4000. A client `.env` is optional locally. Stop demo mode before starting the persistent server, since both use port 4000. Seeding is additive/idempotent and never deletes existing data.

## Demo accounts

| Role     | Email                | Password        |
| -------- | -------------------- | --------------- |
| Customer | customer@vfr.example | ReserveDemo123! |
| Admin    | admin@vfr.example    | ReserveDemo123! |

Seed only into a development/demo database. For a public deployment, replace the demo accounts/passwords before sharing it. Registration always creates Customers; no public admin registration or role-changing endpoint exists.

## Environment

| Variable           | Location | Purpose                                                  |
| ------------------ | -------- | -------------------------------------------------------- |
| MONGODB_URI        | server   | Atlas connection string or local replica-set URI         |
| PORT               | server   | API port, defaults to 4000                               |
| CLIENT_ORIGIN      | server   | Exact frontend origin, without trailing slash            |
| JWT_ACCESS_SECRET  | server   | Unique random secret, minimum 32 characters              |
| JWT_REFRESH_SECRET | server   | Different random secret, minimum 32 characters           |
| NODE_ENV           | server   | development, test, or production                         |
| COOKIE_SAME_SITE   | server   | lax, strict, or none; use none for cross-site production |
| VITE_API_URL       | client   | API URL including `/api`; defaults to `/api`             |

Never put server secrets in `VITE_` variables or commit `.env`. Generate independent JWT secrets with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.

## Commands and quality checks

```sh
npm run lint
npm run typecheck
npm test
npm run build
# all four:
npm run check
```

Server tests use a real temporary MongoDB replica set (network access needed for the first binary download). Tests cover auth/register/login/refresh/logout, unique accounts, validation, role and ownership permissions, room capacity, date overlap and turnaround, concurrent overbooking prevention, payment retry/idempotency, refunds/inventory release, reviews, profile/favorites, CRUD, and analytics. Frontend interaction tests cover major flows. No live payment gateway or external image provider is required.

For reproducible desktop/mobile browser tests:

```sh
npx playwright install chromium
npm run test:e2e
```

The browser tests start a seeded temporary API and preview the production frontend. They cover a real reservation, declined-payment retry, confirmation download, cancellation/refund, profile update, persisted session after reload, customer admin rejection, and admin navigation. They use a disposable database. Stop other local APIs before this run to ensure it uses the temporary database.

## Booking and payment model

Dates are YYYY-MM-DD calendar dates in Zimbabwe time (UTC+02:00). Check-in starts at 14:00; check-out is 10:00. Stays are 1–30 nights and may begin today. Intervals are half-open: `[checkIn, checkOut)`, allowing one booking to check out on the next booking's arrival date.

Each room category has physical units numbered internally from zero. Pending, confirmed, and checked-in bookings block their assigned unit during overlap. Reservation/cancellation/payment/state changes lock inventory by writing the room's version inside a transaction. Competing transactions retry on write conflict, rechecking availability before allocating an unused unit. MongoDB must support transactions: Atlas or a local replica set, not standalone MongoDB.

Pending bookings intentionally remain held until payment or cancellation; this version has no automatic expiry worker. Failed payment attempts leave the hold pending for retry. Customers can cancel them to release inventory. An Admin can cancel abandoned pending bookings. A successful simulation marks payment paid and booking confirmed. The checkout never sends/stores card numbers, expiry or CVC; the displayed card is a fixed fictional demo card.

Cancellation is free through exactly 48 hours before arrival at 14:00. Later cancellations retain the first night's amount and refund the remainder of a paid booking. Unpaid bookings have no charge/refund. No-show is recorded by an Admin after arrival time, cancels/releases inventory, and retains the full paid amount. A separate `noShow` flag preserves the required five-status booking enum. Payment status remains paid when nothing is refunded; partial or full refunds use refunded plus explicit amount/charge fields and an append-only payment ledger.

Status transitions: pending → confirmed on payment; confirmed → checked_in → checked_out by Admin at the relevant arrival/departure times; pending/confirmed → cancelled. Completed stays alone can publish one review per booking. Cancellation and payment mutations are transactional and reject duplicates.

Hotel/room deletion archives records to preserve booking references. Reducing room units is rejected when a retained active booking uses a unit outside the proposed range. A room cannot be transferred between hotels. Existing booked rates are snapshots and are unaffected by later price changes.

## Architecture

```text
client/
  public/images/{hotels,rooms,destinations,branding,ui}/
  src/api.ts                 centralized requests and single-flight token refresh
  src/auth.tsx               in-memory access token/session context
  src/components.tsx         shared layout, guards, loading/error states
  src/pages/                 customer and admin screens
server/
  src/app.ts                 middleware and structured error boundary
  src/routes/                auth, customer, and admin route modules
  src/auth.ts                JWT, cookies, authentication and role checks
  src/validation.ts          Zod input contracts
  src/models.ts              Mongoose schemas and indexes
  src/services/booking.ts    transactional inventory and policy rules
  src/seed-data.ts           idempotent fixtures
```

Access tokens last 15 minutes and live only in memory. Refresh tokens last 7 days, rotate on use, and are stored as SHA-256 hashes with a TTL index. An HTTP-only cookie carries the refresh token; production cookies are Secure. Logout revokes the current refresh session; an already-issued access token can remain valid until its 15-minute expiry. Mutation origin checks, exact CORS, Helmet, global/auth rate limiting, small request limits, bcrypt cost 12, Zod validation and ownership checks protect the API. Admin authorization reads the current database role each request. MongoDB errors and internal details are not exposed to users.

Lists have explicit upper bounds (200 customer bookings, 500 admin records, 100 hotel reviews), suitable for this portfolio scope. Hotel search uses bulk room/overlap queries and compound indexes; a production system should add cursor pagination for a larger catalogue. No password recovery, email delivery, dynamic uploads, real payment processing, or production operational monitoring is included.

## Main API routes

- `/api/auth/register`, `/login`, `/refresh`, `/logout` (POST)
- `/api/me` (GET/PATCH), `/api/me/favorites/:id` (POST/DELETE)
- `/api/hotels` (GET search), `/api/hotels/:id` (GET)
- `/api/rooms/:id/availability?checkIn=...&checkOut=...` (GET)
- `/api/bookings` (GET/POST), `/api/bookings/:id` (GET)
- `/api/bookings/:id/pay`, `/api/bookings/:id/cancel` (POST)
- `/api/reviews` (POST)
- `/api/admin/analytics`, `/customers`, `/payments`, `/reviews` (GET)
- `/api/admin/hotels`, `/rooms` (GET/POST), `/:id` (PATCH/DELETE)
- `/api/admin/bookings` (GET), `/api/admin/bookings/:id` (PATCH action)
- `/api/admin/reviews/:id` (DELETE)

Errors return `{ error: { message, details? } }`. API mutations use JSON. All `/api/admin/*` routes require a current Admin JWT; booking reads and customer mutations enforce ownership.

## Deploy together from one repository

The two hosts deploy the same repository independently. MongoDB Atlas provides persistent data and transaction support.

1. Create an Atlas database user with access only to the project database. Configure Atlas network access for your backend and set its connection URI in Render.
2. Render web service: repository root as root directory, build `npm ci --include=dev && npm run build -w server`, start `npm run start -w server`. The build explicitly includes development dependencies because the TypeScript compiler is required even when `NODE_ENV=production`. Set all server variables, `NODE_ENV=production`, and your frontend `CLIENT_ORIGIN`. `render.yaml` supplies a blueprint. Use `/api/health` as the health check.
3. Vercel: import the same repository, choose `client` as the root directory, Vite framework, `npm run build` build command, `dist` output. Set `VITE_API_URL=https://your-render-service.onrender.com/api`. `client/vercel.json` includes SPA navigation rewrites.
4. For default vercel.app + onrender.com domains use `COOKIE_SAME_SITE=none`. Some browsers block third-party cookies regardless; for reliable persistent auth use same-site custom domains, e.g. `reserve.example.com` and `api.example.com`, with `COOKIE_SAME_SITE=lax`. Credentials are enabled on fetch and CORS.
5. Seed development fixtures using your chosen database URI in a local server `.env`: `npm run seed`. Restart/redeploy after environment changes, then check health, login, booking and admin permissions.

Hosting references: [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite), [Render monorepo support](https://render.com/docs/monorepo-support), [MongoDB transactions](https://www.mongodb.com/docs/manual/core/transactions/).

## Images and design

All SVG illustrations are original project artwork stored locally. Replace them with your own licensed hotel/room photographs without changing the image architecture; update the seeded/admin image paths accordingly. The layout is an original hospitality interpretation: restrained serif headings, clean system sans-serif UI, ivory surfaces, charcoal actions, gray-green supporting panels, muted green accents, and generous spacing. No reference templates or source designs are copied.

## Confirmation and accessibility

Booking details include downloadable plain-text confirmation and print styling; the browser's Print → Save as PDF produces a PDF without a third-party service. Forms use labels, browser validation plus server Zod validation, keyboard focus indicators, live status/error messages, a skip link, responsive layouts, and visible empty states.

See `VERIFICATION.md` for the checks executed on the packaged project.
