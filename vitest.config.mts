import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx", "prisma/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: [
        "src/lib/utils/comparison.ts",
        "src/lib/utils/chart-data.ts",
        "src/lib/cfo-agent/**/*.ts",
        "src/app/api/cfo/**/*.ts",
      ],
      exclude: [
        "src/lib/cfo-agent/**/*.test.ts",
        "src/app/api/cfo/**/*.test.ts",
      ],
      reporter: ["text", "lcov"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
