import { DATABASE_URL, ensurePostgres } from "./postgres.mjs";

await ensurePostgres();
console.log(`[db] DATABASE_URL=${DATABASE_URL}`);
