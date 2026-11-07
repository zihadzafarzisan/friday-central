import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
export default defineConfig({
  resolve: {
    alias: {
      "@friday/schemas": fileURLToPath(new URL("./packages/schemas/src/index.ts", import.meta.url)),
      "@friday/solver": fileURLToPath(new URL("./packages/solver/src/index.ts", import.meta.url)),
    },
  },
  test: { include: ["packages/**/*.test.ts", "apps/**/*.test.ts"], testTimeout: 30000 },
});
