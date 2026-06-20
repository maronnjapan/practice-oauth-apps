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

// テスト用にセッションCookieを組み立てる。
// 本書の実装は署名なしのCookieにユーザーIDを直接入れているため、同じ形式を再現する。
export const createSessionCookie = (userId: string) => {
    return `session=${encodeURIComponent(userId)}`
}