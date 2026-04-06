-- CreateTable
CREATE TABLE "PriceHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "symbol" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "close" REAL NOT NULL,
    "currency" TEXT NOT NULL
);

-- CreateIndex
CREATE INDEX "PriceHistory_symbol_idx" ON "PriceHistory"("symbol");

-- CreateIndex
CREATE UNIQUE INDEX "PriceHistory_symbol_date_key" ON "PriceHistory"("symbol", "date");
