# Simplefolio

A self-hosted personal wealth management app built with Next.js, Prisma, and PostgreSQL. Track investment accounts, transactions, dividends, and portfolio value over time.

## Features

### 📊 Portfolio Management & Analytics
- **Multi-Account & Multi-Currency** — Create and manage several investment accounts spanning different fiat currencies. Includes on-the-fly, automated FX rate conversions to view your aggregated portfolio accurately in a base currency.
- **Advanced Return Metrics (XIRR)** — Deep, money-weighted annualized return calculations that accurately reflect the timings of buys, sells, and dividends, seamlessly backing out DRIP events for pristine performance numbers.
- **Interactive Dashboards** — Visualize total portfolio value over time and track your monthly/annual dividend income using dynamic charts.
- **Aggregate Holdings** — See your consolidated position for each asset across all accounts in your portfolio.

### 💼 Transactions & Cash Flows
- **Granular Transaction Types** — Record BUYS, SELLS, and DIVIDEND payments manually or via bulk imports.
- **DRIP & Tax Support** — First-class support for Dividend Reinvestment Plans (DRIP) and the ability to apply non-resident alien (NRA) withholding taxes on dividend income.
- **Automated Dividend Imports** — Stay on top of your passive income with an automated daily background task that syncs new dividends to your accounts.

### 🌎 Global Asset Coverage
- **Equities & ETFs** — Seamless symbol search, metadata resolution, and historical price syncing powered by Yahoo Finance.
- **Sovereign Bonds (Tesouro Direto)** — Fully integrated support for Brazilian government bonds (Tesouro Direto). Accurately fetch daily unit prices (PU) and chart bond performance out of the box.

### 🛠 Data Portability & Health
- **Bulk Import / Export** — Easily migrate or back up your transaction history via CSV. Automatically identifies accounts, asset classes, and parses foreign currencies.
- **Robust Integration Testing** — Covered extensively by unit tests (Vitest) for mission-critical domain logic and Patrol integration tests to ensure reliable, unbreakable releases.

## Finance Integrations Architecture

Simplefolio uses a decoupled **DataProvider** registry to connect with external financial APIs and markets. This ensures the application logic is completely agnostic of the underlying data source, whether it's Yahoo Finance, a local central bank, or a custom internal API.

### Current Providers

1. **Yahoo Finance (`YAHOO`)**: The default provider tailored for global equities, ETFs, and mutual funds. Handles standard ticker symbols (e.g. `AAPL`, `VT`).
2. **Tesouro Direto (`TESOURO`)**: A specialized integration tailored for Brazilian sovereign bonds. Handles parsing proprietary bond names (e.g. `Tesouro Selic 2029`), resolving them into internal canonical tickers (e.g. `TD:TESOURO_SELIC_2029`), and fetching accurate unit prices (PU) directly from the Brazilian treasury endpoint.

### Adding a New Data Source

To add a new bond or equity provider (for example, US Treasury Direct or a Crypto exchange), follow these steps:

1. **Implement `DataProvider`**: Create a new class under `src/lib/providers/` that implements the `DataProvider` interface. You must define a unique `id` (e.g., `TREASURY_DIRECT`), an `instrumentType` (e.g., `BOND`), and implement the `syncPriceHistory(ticker, fromDate)` method to fetch and map data into standard `PriceCandle` models.
2. **Register the Provider**: In the same file, instantiate your class and call `registerProvider(myNewProvider)` from the registry.
3. **Load the Provider**: Add a side-effect import for your new provider file inside `src/lib/providers/index.ts` to ensure it boots up when the app initializes.
4. **Action & UI Layer**: Update or create server actions and UI components that save transactions with the `instrumentProvider` matching your provider's `id`. The core system will automatically route pricing syncs, chart aggregations, and currency conversions using the centralized registry based on this ID.

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router, React Server Components)
- [Prisma 7](https://www.prisma.io) with PostgreSQL
- [Tailwind CSS v4](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com)
- [Recharts](https://recharts.org) for charts
- [Docker Compose](https://docs.docker.com/compose) for local Postgres and production deployment

---

## Prerequisites

- [Node.js 22+](https://nodejs.org)
- [Docker](https://www.docker.com) (required for the PostgreSQL database)

---

## Local development

### 1. Install dependencies

```bash
npm install
```

### 2. Start the database

```bash
docker compose up db -d
```

This starts a PostgreSQL 17 container with data persisted in a named Docker volume. It also exposes port `5432` on your host so Prisma can reach it directly.

### 3. Configure environment

```bash
cp .env.example .env
```

The default `.env.example` already contains the correct connection string for the local Docker database:

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/simplefolio
```

### 4. Run migrations and generate the Prisma client

```bash
npx prisma migrate dev
```

On first run this applies the `init` migration and generates the Prisma client.

### 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Docker (production-style)

Runs the full stack — Next.js app + PostgreSQL — in containers.

```bash
docker compose up --build
```

- The app is available at [http://localhost:3000](http://localhost:3000).
- On startup the container automatically runs `prisma migrate deploy` to apply any pending migrations before serving traffic.
- Database data is persisted in a Docker volume (`postgres_data`).

To stop and remove containers (volume is preserved):

```bash
docker compose down
```

To also wipe all data:

```bash
docker compose down -v
```

---

## Database migrations

This project uses PostgreSQL in all environments, so the same migrations apply everywhere.

### Making a schema change

1. Edit `prisma/schema.prisma`.
2. Generate and apply the migration locally:

```bash
npx prisma migrate dev --name describe_your_change
```

3. Commit the new migration file created inside `prisma/migrations/`.
4. The next `docker compose up --build` will apply it automatically via `prisma migrate deploy`.

### Useful Prisma commands

```bash
npx prisma migrate dev              # apply pending migrations + generate client
npx prisma migrate dev --name <x>  # create a new named migration
npx prisma migrate reset            # drop and recreate the DB (dev only, loses data)
npx prisma studio                   # open the Prisma data browser GUI
npx prisma generate                 # regenerate the client without touching the DB
```

---

## Project structure

```
prisma/
  schema.prisma        # Database schema (PostgreSQL)
  migrations/          # Migration history (committed to git)
  seed.ts              # Seeds a default user on first run
src/
  app/                 # Next.js App Router pages
    (app)/
      accounts/        # Account list, detail, create, edit
      dashboard/       # Portfolio overview
      holdings/        # Aggregate holdings view
      settings/        # Import tools
      symbol/          # Symbol detail and price history
  actions/             # Next.js Server Actions (mutations)
  components/          # Shared UI components
  domain/              # Business logic (portfolio calculations, finance)
  lib/                 # Prisma client, utilities, formatters
  repositories/        # Database query functions
```

---

## Environment variables

Variable: `DATABASE_URL`
Description: PostgreSQL connection string
Example: `postgresql://postgres:postgres@localhost:5432/simplefolio`
