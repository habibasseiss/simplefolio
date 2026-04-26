import { resolve } from "path";
import { defineConfig } from "vitest/config";

/**
 * Integration test config — no mocks, real PostgreSQL DB.
 * Requires the DB to be running (docker compose up db -d).
 * Run with: npm run test:integration
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.integration.test.ts"],
    globals: true,
    alias: {
      "@": resolve(__dirname, "./src"),
    },
    // No setupFiles — we don't want jest-dom or any mock setup
    testTimeout: 30000,
  },
});
