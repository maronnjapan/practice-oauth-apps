import { applyD1Migrations, env } from "cloudflare:test";

const migrations = env.TEST_MIGRATIONS
await applyD1Migrations(env.DB, migrations);