import type { Bindings } from "../src";

declare module "cloudflare:test" {
    interface ProvidedEnv extends Env, Bindings {
        TEST_MIGRATIONS: D1Migration[];
    }
}