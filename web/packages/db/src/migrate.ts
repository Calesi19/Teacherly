import { loadEnv, requireDatabaseUrl } from "./env";
import { runMigrations } from "./migrator";

loadEnv();

const connectionString = requireDatabaseUrl();

await runMigrations(connectionString);
console.log("[db] migrations applied");
