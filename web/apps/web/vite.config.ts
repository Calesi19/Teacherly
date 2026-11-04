import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const API_PORT = process.env["PORT"] ?? "3000";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
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
