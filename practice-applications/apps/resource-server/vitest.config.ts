import { defineWorkersConfig, readD1Migrations } from "@cloudflare/vitest-pool-workers/config";
import path from "node:path";

export default defineWorkersConfig(async () => {
    const migrationsPath = path.join(__dirname, "migrations");
    const migrations = await readD1Migrations(migrationsPath);
    return {
        test: {
            globals: true,
            setupFiles: ["./test/apply-migrations.ts", "./test/setup.ts"],
            poolOptions: {
                workers: {
                    wrangler: { configPath: "./wrangler.toml" },
                    miniflare: {
                        // Add a test-only binding for migrations, so we can apply them in a
                        // setup file
                        bindings: { TEST_MIGRATIONS: migrations },
                    },
                },
            },
        },
        plugins: [
            // swc.vite()
        ],


    }
})