import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // The domain package is the only thing with unit tests in this chunk, by
    // design: it is the only place with logic that does not need a database.
    include: ["packages/*/src/**/*.test.ts"],
    environment: "node",
  },
});
