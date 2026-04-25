-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "fxSnapshots" JSONB;

-- CreateTable
CREATE TABLE "FxRateHistory" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "currency" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'PTAX',
    "buyRate" DOUBLE PRECISION NOT NULL,
    "sellRate" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "FxRateHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FxRateHistory_date_currency_idx" ON "FxRateHistory"("date", "currency");

-- CreateIndex
CREATE UNIQUE INDEX "FxRateHistory_date_currency_source_key" ON "FxRateHistory"("date", "currency", "source");
