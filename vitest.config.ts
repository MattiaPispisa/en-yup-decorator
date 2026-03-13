import { defineConfig } from "vitest/config";
import swc from "vite-plugin-swc-transform";

export default defineConfig({
  plugins: [
    swc({
      swcOptions: {
        jsc: {
          parser: {
            syntax: "typescript",
            decorators: true,
          },
          transform: {
            decoratorVersion: "2022-03",
          },
        },
      },
    }),
  ],
  test: {
    globals: true,
    environment: "node",
    include: ["test/**/*.test.ts"],
    coverage: {
      include: ["src/**/*.ts"],
      exclude: ["test/**", "**/*.test.ts", "**/*.d.ts"],
      thresholds: {
        functions: 100,
        lines: 95,
        statements: 95,
      },
    },
  },
});
