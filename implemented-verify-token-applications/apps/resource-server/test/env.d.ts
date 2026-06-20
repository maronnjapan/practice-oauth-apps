import type { Bindings } from "../src";

declare module "cloudflare:test" {
    interface ProvidedEnv extends Env, Bindings {
        PRIVATE_KEY: string;
        PUBLIC_KEY: string;
    }
}
