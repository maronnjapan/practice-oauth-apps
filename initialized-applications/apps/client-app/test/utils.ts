import { env } from "cloudflare:test";
import { createExecutionContext } from "cloudflare:test";
import app from "../src";

export const fetchTestApplication = async (path: string, requestHeaders?: RequestInit) => {
    const ctx = createExecutionContext();
    const request = new Request(`http://localhost${path}`, {
        ...requestHeaders,
    })
    return await app.fetch(request, env, ctx)
}