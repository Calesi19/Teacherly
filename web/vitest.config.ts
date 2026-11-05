import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Both halves of the workspace. This previously read `packages/*` only,
    // which meant a test file placed under `apps/` was silently never run —
    // the failure mode where a suite is green because it collected nothing.
    // `createApp` is testable with a fake AuthService and no database, so
    // `apps/server` has real route-level tests now.
    include: ["{packages,apps}/*/src/**/*.test.ts"],
    environment: "node",
  },
});
