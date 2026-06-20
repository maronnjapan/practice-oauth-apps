import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig(async () => {
    return {
        test: {
            globals: true,
            poolOptions: {
                workers: {
                    wrangler: { configPath: "./wrangler.jsonc" },
                    miniflare: {
                        bindings: {
                            CLIENT_ID: 'test-client-id',
                            CLIENT_SECRET: 'test-client-secret',
                            REDIRECT_URI: 'http://localhost:8788/callback',
                            ISSUER_URI: 'http://localhost:8787'
                        }
                    },
                },
            },
        }
    }
})