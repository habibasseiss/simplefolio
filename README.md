# Simplefolio

A self-hosted personal wealth management app built with Next.js, Prisma, and PostgreSQL. Track investment accounts, transactions, dividends, and portfolio value over time.

## Features

- **Accounts** — manage multiple investment accounts with different currencies
- **Transactions** — record buy, sell, and dividend transactions per account
- **Holdings** — aggregate portfolio view across all accounts
- **Dashboard** — portfolio value over time and dividend income charts
- **Symbol search** — instrument metadata and price history synced from Yahoo Finance
- **Import** — bulk import transactions and dividends

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
