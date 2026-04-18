-- Migration: structural_asset_types
-- Adds instrumentType and instrumentProvider to Transaction/Symbol,
-- adds instrumentProvider to PriceHistory, and backfills data.

-- === Transaction ===

ALTER TABLE "Transaction"
  ADD COLUMN "instrumentType"     TEXT NOT NULL DEFAULT 'EQUITY',
  ADD COLUMN "instrumentProvider" TEXT NOT NULL DEFAULT 'YAHOO';

-- Backfill existing Tesouro bonds (strip TD: prefix, set BOND/TESOURO)
UPDATE "Transaction"
SET "instrumentType"     = 'BOND',
    "instrumentProvider" = 'TESOURO',
    "symbol"             = SUBSTRING("symbol" FROM 4)
WHERE "symbol" LIKE 'TD:%';

-- === PriceHistory ===

ALTER TABLE "PriceHistory"
  ADD COLUMN "instrumentProvider" TEXT NOT NULL DEFAULT 'YAHOO';

-- Backfill existing Tesouro price rows before dropping old constraint
UPDATE "PriceHistory"
SET "instrumentProvider" = 'TESOURO',
    "symbol"             = SUBSTRING("symbol" FROM 4)
WHERE "symbol" LIKE 'TD:%';

-- Drop old unique index, add new composite one
DROP INDEX IF EXISTS "PriceHistory_symbol_date_key";

CREATE UNIQUE INDEX "PriceHistory_symbol_instrumentProvider_date_key"
  ON "PriceHistory" ("symbol", "instrumentProvider", "date");

-- Drop old index, add new composite index
DROP INDEX IF EXISTS "PriceHistory_symbol_idx";
CREATE INDEX "PriceHistory_symbol_instrumentProvider_idx"
  ON "PriceHistory" ("symbol", "instrumentProvider");

-- === Symbol ===

-- Add columns first (needed for the INSERT below)
ALTER TABLE "Symbol"
  ADD COLUMN "instrumentType"     TEXT NOT NULL DEFAULT 'EQUITY',
  ADD COLUMN "instrumentProvider" TEXT NOT NULL DEFAULT 'YAHOO';

-- Symbol ticker is the PK; we can't UPDATE the PK in place.
-- Strategy: insert new rows with stripped ticker and correct metadata,
--           then delete the old prefixed rows.
INSERT INTO "Symbol" ("ticker", "name", "exchange", "instrumentType", "instrumentProvider")
SELECT
  SUBSTRING("ticker" FROM 4) AS "ticker",
  "name",
  "exchange",
  'BOND'                     AS "instrumentType",
  'TESOURO'                  AS "instrumentProvider"
FROM "Symbol"
WHERE "ticker" LIKE 'TD:%'
ON CONFLICT ("ticker") DO UPDATE
  SET "instrumentType"     = EXCLUDED."instrumentType",
      "instrumentProvider" = EXCLUDED."instrumentProvider";

DELETE FROM "Symbol" WHERE "ticker" LIKE 'TD:%';
