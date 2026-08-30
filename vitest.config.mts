import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // Exclut les tests E2E Playwright (30/08) — ils vivent dans tests/e2e
    // et sont lances via `npm run test:e2e`, pas via vitest.
    exclude: ["**/node_modules/**", "**/tests/e2e/**"],
  },
});
