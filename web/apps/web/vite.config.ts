import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const API_PORT = process.env["PORT"] ?? "3000";

/**
 * One variable drives the dev client's port everywhere it is named: here,
 * `playwright.config.ts`, and `DEV_CLIENT_ORIGIN` in the server config. It was
 * hardcoded to 5173 in all three, so a machine with 5173 already in use could
 * neither `pnpm dev` (`Port 5173 is already in use`, with `strictPort`) nor
 * `pnpm test:e2e` (`Process from config.webServer was not able to start`).
 */
const CLIENT_PORT = Number(process.env["DEV_CLIENT_PORT"] ?? 5173);

export default defineConfig({
  plugins: [react()],
  server: {
    port: CLIENT_PORT,
    // Kept strict on purpose: silently sliding to 5174 would desynchronize the
    // client from DEV_CLIENT_ORIGIN and break credentialed CORS in a way that
    // is much harder to diagnose than a refusal to start.
    strictPort: true,
    // Proxy so the browser sees one origin in development and the session
    // cookie behaves exactly as it will in production.
    proxy: {
      "/api": {
        target: `http://127.0.0.1:${API_PORT}`,
        changeOrigin: false,
      },
    },
  },
});
