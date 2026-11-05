import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

import { dockerAvailable, stopEmbedded, WEB_ROOT } from "./postgres.mjs";

// Stop whichever backend `pnpm db:up` actually started. Data is kept in both
// cases — the docker volume and .pgdata survive, so `pnpm db:up` comes straight
// back up with the same rows.
if (existsSync(join(WEB_ROOT, ".pgdata", "PG_VERSION"))) {
  console.log(stopEmbedded() ? "[db] embedded PostgreSQL stopped" : "[db] embedded PostgreSQL was not running");
}

if (dockerAvailable()) {
  spawnSync("docker", ["compose", "down"], { cwd: WEB_ROOT, stdio: "inherit" });
}
