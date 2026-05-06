import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    coverage: {
      provider: "v8",
      include: ["src/lib/utils/comparison.ts", "src/lib/utils/chart-data.ts"],
      reporter: ["text", "lcov"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
