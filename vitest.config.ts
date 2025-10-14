import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "istanbul",
      reporter: ["text", "lcov", "html"],
      reportsDirectory: "coverage",
    },
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
});
