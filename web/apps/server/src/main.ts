import { serve } from "@hono/node-server";
import { getConnInfo } from "@hono/node-server/conninfo";

import { createApp } from "./app";
import { loadConfig } from "./config";
import { createContainer } from "./container";

const config = loadConfig();
const container = await createContainer(config.databaseUrl);

const app = createApp({
  auth: container.auth,
  school: container.school,
  gradebook: container.gradebook,
  cookie: { secure: config.cookieSecure },
  ...(config.isProduction ? {} : { devClientOrigin: config.devClientOrigin }),
  // The socket's remote address, never `X-Forwarded-For`: nothing in front of
  // this server is trusted to set that header, and honouring it would let a
  // caller clear their own rate-limit counter by spoofing it. Behind a real
  // proxy this becomes the proxy's address and the per-email counter carries
  // the load until a trusted-proxy setting exists.
  clientIp: (c) => getConnInfo(c).remote.address ?? "unknown",
  // Absent disables signup. `loadConfig` has already turned an unset or blank
  // SIGNUP_INVITE_CODE into `undefined`, so there is one fail-closed decision
  // and it is not made here.
  signupInviteCode: config.signupInviteCode,
});

if (config.signupInviteCode === undefined) {
  // Worth a line at startup: signup returning 503 is otherwise a confusing
  // thing to debug from the client side.
  console.log("[server] SIGNUP_INVITE_CODE is not set — signup is disabled");
}

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
