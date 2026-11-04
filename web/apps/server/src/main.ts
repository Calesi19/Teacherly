import { serve } from "@hono/node-server";

import { createApp } from "./app";
import { loadConfig } from "./config";
import { createContainer } from "./container";

const config = loadConfig();
const container = await createContainer(config.databaseUrl);

const app = createApp({
  auth: container.auth,
  cookie: { secure: config.cookieSecure },
  ...(config.isProduction ? {} : { devClientOrigin: config.devClientOrigin }),
});

const server = serve({ fetch: app.fetch, port: config.port }, (info) => {
  console.log(`[server] listening on http://localhost:${info.port}`);
});

async function shutdown(signal: string): Promise<void> {
  console.log(`[server] ${signal} received, shutting down`);
  server.close();
  await container.close();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
