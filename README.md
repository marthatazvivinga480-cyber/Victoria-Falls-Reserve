# Victoria Falls Reserve

A hotel booking application for exploring stays in Victoria Falls, managing reservations, and administering hotel operations. Built as a student portfolio project with React, TypeScript, Express, and MongoDB.

The catalogue contains six demo hotel listings. Payments are simulated; no real money is collected.

## Features

- Search hotels by dates, guest count, nightly budget, and amenities.
- Browse hotel and room photographs, compare rates, and check availability.
- Create an account, save favourite hotels, and update your profile.
- Reserve rooms, simulate payments, and retry declined payments.
- View upcoming, past, and cancelled stays; download or print booking confirmations.
- Cancel reservations with refunds calculated from the cancellation policy.
- Submit a guest review after a completed stay.
- Manage hotels, rooms, bookings, customers, reviews, and payment records through the admin dashboard.
- Use responsive layouts on phones and larger screens.

## Technology

| Area | Tools |
| --- | --- |
| Frontend | React, TypeScript, Vite, Tailwind CSS, React Router |
| Backend | Node.js, Express, TypeScript |
| Database | MongoDB, Mongoose |
| Authentication | JWT access tokens, refresh cookies, bcrypt |
| Validation | Zod |
| Testing | Vitest, React Testing Library, Playwright |

## Local setup

Install Node.js 22.12 or newer and npm. Use MongoDB Atlas or a local replica set because bookings require database transactions.

```sh
git clone https://github.com/marthatazvivinga480-cyber/Victoria-Falls-Reserve.git
cd Victoria-Falls-Reserve
npm ci
```

Copy `server/.env.example` to `server/.env` and configure:

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI` | Your MongoDB connection string |
| `PORT` | API port; defaults to `4000` |
| `CLIENT_ORIGIN` | Use `http://127.0.0.1:5173` for this local setup |
| `JWT_ACCESS_SECRET` | Private random value of at least 32 characters |
| `JWT_REFRESH_SECRET` | Different private random value of at least 32 characters |
| `SEED_ADMIN_PASSWORD` | Private password of 16 to 72 characters, required to create the admin |
| `NODE_ENV` | `development` for local use |
| `COOKIE_SAME_SITE` | `lax` for local use |

Generate each JWT secret separately:

```sh
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Keep the generated values in the local environment file. Server secrets must never go in frontend variables prefixed with `VITE_`.

Seed the development database and start the application:

```sh
npm run seed
npm run dev
```

Open [the local website](http://127.0.0.1:5173). The API runs on port `4000`; the frontend forwards `/api` requests to it. Wait for the database connection and API startup before signing in.

Seeding adds missing demo records without deleting existing data or resetting an existing admin password.

### Temporary demo

To use a temporary database, run these commands in separate terminals:

```sh
npm run dev:demo
```

```sh
npm run dev -w client
```

Demo mode downloads a MongoDB binary on first use, seeds a temporary replica set, and prints a temporary admin password locally. Data is discarded when stopped. Stop this mode before running the persistent backend, since both use port `4000`.

### Administrator access

The seeded admin email is `admin@vfr.example`. Its password comes from your private `SEED_ADMIN_PASSWORD`; normal seeding has no default admin password. Public registration creates customer accounts.

To change an existing admin password, update that local environment variable and run:

```sh
npm run admin:password
```

This changes the password and revokes the admin's existing sessions while preserving customer accounts and bookings.

## Booking rules

- Dates and booking times use Zimbabwe time, UTC+02:00.
- Check-in starts at 14:00 on arrival day. Admin checkout is available from 10:00 on departure day.
- Stays last from 1 to 30 nights, subject to availability and guest capacity.
- Pending, confirmed, and checked-in bookings reserve inventory. Failed payments can be retried; pending reservations remain held until payment or cancellation.
- Cancellation is free up to 48 hours before arrival at 14:00. Later cancellations retain the first night's amount and refund the remaining paid balance.
- Admins can record a no-show after arrival time; the paid amount is retained and inventory is released.
- Only checked-out stays qualify for a review, with one review per booking.
- Archived hotels and rooms retain existing booking records. Later price changes do not alter booked rates.

Payments are simulated and do not collect or store card numbers, expiry dates, or security codes.

## Project structure

```text
client/
  public/images/        Hotel, room, destination, and branding assets
  src/pages/            Customer and admin pages
  src/components.tsx    Shared layout and route guards
  src/auth.tsx          Session context
  src/api.ts            Requests and token refresh
server/
  src/routes/           Authentication, customer, and admin endpoints
  src/services/         Booking and inventory rules
  src/models.ts         Database models and indexes
  src/validation.ts     Request validation
  src/seed-data.ts      Demo records
  src/photo-manifest.ts Photo mappings
e2e/                    Browser test scenarios
```

## Development commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start frontend and backend |
| `npm run seed` | Add missing demo data |
| `npm run lint` | Check lint rules |
| `npm run typecheck` | Check TypeScript types |
| `npm test` | Run frontend and backend tests |
| `npm run build` | Build both applications |
| `npm run check` | Run lint, type checks, tests, and builds |
| `npm run test:e2e` | Build and run browser tests |
| `npm run images:sync` | Update image paths on existing seeded hotels and rooms |

Backend tests use a temporary MongoDB replica set. The first run may require network access to download its binary. Install Chromium before running browser tests:

```sh
npx playwright install chromium
npm run test:e2e
```

Browser tests use a disposable database and separate ports: `14000` for the API and `15173` for the frontend.

## Images

Photographs are stored locally under `client/public/images`. They illustrate the demo listings and do not identify actual hotel properties. Source filenames and links are listed in [IMAGE_CREDITS.md](IMAGE_CREDITS.md).

Run `npm run images:sync` for databases seeded before the photographs were added. This updates image paths without changing bookings or accounts.

## Deployment configuration

The repository includes `render.yaml` for the backend and `client/vercel.json` for frontend routing. Store server secrets in the backend host's environment settings. Set frontend `VITE_API_URL` to the deployed API address, including `/api`, and backend `CLIENT_ORIGIN` to the exact frontend origin.

Use a transaction-capable MongoDB database. Configure cookies for the deployment domains and replace demo accounts before making a public deployment available.

## Project scope

This portfolio demonstrates the booking lifecycle, inventory checks, account permissions, and hotel administration. It does not include real payment processing, password recovery, email delivery, automatic expiry of pending reservations, or production monitoring.

## Keeping credentials private

Local `.env` files, private key files, dependencies, and build output are excluded by `.gitignore`. Commit environment templates containing placeholders only. Never add database passwords, private admin passwords, JWT secrets, or access tokens to documentation or source files.
