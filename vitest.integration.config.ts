import path from "node:path";

import { defineConfig } from "vitest/config";

// Separate from vitest.config.ts on purpose: these tests hit the real Neon
// database over the network, so they run in the plain "node" environment
// (no jsdom needed), sequentially (fileParallelism: false) to avoid racing
// each other against the same external database, and live under tests/
// instead of src/ so `pnpm test` (unit only) never picks them up.
export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./tests/integration/setup.ts"],
    include: ["tests/integration/**/*.test.ts"],
    fileParallelism: false,
    testTimeout: 20000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
