import app from "..";

// Base64URL形式の文字列をデコードする
const base64UrlDecode = (str: string) => {
    const replaced = str.replace(/-/g, "+").replace(/_/g, "/");
    return atob(replaced);
};

/**
 * subに対応するユーザー名（第5章のデモユーザーと同じ値）
 * リソースサーバーはDBを参照せず、JWTのクレームと固定値だけで応答する
 */
const USER_NAMES: Record<string, string> = {
    "user-001": "テストユーザー",
};

export const setUpApiRoutes = (baseApp: typeof app) => {
    baseApp.get("/api/profile", async (c) => {
        // 1. AuthorizationヘッダーからBearerトークンを取り出す
        // 認証スキーム名（Bearer）は大文字小文字を区別しない（RFC 9110 Section 11.1 / RFC 6750）
        // そのため Bearer / bearer / BEARER のいずれも受け付ける
        const authHeader = c.req.header("Authorization") || "";
        const bearerMatch = authHeader.match(/^Bearer +(.+)$/i);
        if (!bearerMatch) {
            return c.json({ error: "invalid_request" }, 401, {
                "WWW-Authenticate": "Bearer",
            });
        }
        const accessToken = bearerMatch[1];

        // 2. JWTを3パートに分割し、ヘッダーとペイロードをデコードする
        const [header, payload, signature] = accessToken.split(".");
        if (!header || !payload || !signature) {
            return c.json({ error: "invalid_token" }, 401, {
                "WWW-Authenticate": 'Bearer error="invalid_token"',
            });
        }
        let parsedHeader: { kid?: string };
        let parsedPayload: {
            iss?: string;
            aud?: string;
            exp?: number;
            scope?: string;
            sub?: string;
        };
        try {
            parsedHeader = JSON.parse(base64UrlDecode(header));
            parsedPayload = JSON.parse(base64UrlDecode(payload));
        } catch {
            return c.json({ error: "invalid_token" }, 401, {
                "WWW-Authenticate": 'Bearer error="invalid_token"',
            });
        }

        // 3. 認可サーバーのJWKSエンドポイントから公開鍵を取得し、kidが一致する鍵を探す
        const jwksRes = await fetch(
            `${c.env.AUTHORIZATION_SERVER_ISSUER}/.well-known/jwks.json`,
        );

        if (!jwksRes.ok) {
            return c.json({ error: "server_error" }, 500);
        }
        const jwks = (await jwksRes.json()) as {
            keys: (JsonWebKey & { kid: string })[];
        };
        const publicKeyJson = jwks.keys.find(
            (key) => key.kid === parsedHeader.kid,
        );
        if (!publicKeyJson) {
            return c.json({ error: "invalid_token" }, 401, {
                "WWW-Authenticate": 'Bearer error="invalid_token"',
            });
        }
        const publicKey = await crypto.subtle.importKey(
            "jwk",
            publicKeyJson,
            { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
            false,
            ["verify"],
        );

        // 4. RS256で署名を検証する
        const signatureBuffer = Uint8Array.from(
            base64UrlDecode(signature),
            (ch) => ch.charCodeAt(0),
        );
        const isVerified = await crypto.subtle.verify(
            { name: "RSASSA-PKCS1-v1_5" },
            publicKey,
            signatureBuffer,
            new TextEncoder().encode(`${header}.${payload}`),
        );
        if (!isVerified) {
            return c.json({ error: "invalid_token" }, 401, {
                "WWW-Authenticate": 'Bearer error="invalid_token"',
            });
        }

        // 5. issが信頼する認可サーバーと一致するか検証する
        if (parsedPayload.iss !== c.env.AUTHORIZATION_SERVER_ISSUER) {
            return c.json({ error: "invalid_token" }, 401, {
                "WWW-Authenticate": 'Bearer error="invalid_token"',
            });
        }

        // 6. audが自分（リソースサーバー）宛てか検証する
        if (parsedPayload.aud !== c.env.RESOURCE_SERVER_IDENTIFIER) {
            return c.json({ error: "invalid_token" }, 401, {
                "WWW-Authenticate": 'Bearer error="invalid_token"',
            });
        }

        // 7. 有効期限を検証する
        const currentTime = Math.floor(Date.now() / 1000);
        if (!parsedPayload.exp || parsedPayload.exp < currentTime) {
            return c.json({ error: "invalid_token" }, 401, {
                "WWW-Authenticate": 'Bearer error="invalid_token"',
            });
        }

        // 8. このAPIに必要なスコープ（read:profile）を持っているか検証する
        const requiredScope = "read:profile";
        const tokenScopes = parsedPayload.scope
            ? parsedPayload.scope.split(" ")
            : [];
        if (!tokenScopes.includes(requiredScope)) {
            return c.json({ error: "insufficient_scope" }, 403, {
                "WWW-Authenticate": 'Bearer error="insufficient_scope"',
            });
        }

        // すべての検証を通過したので、JWTのクレームからプロフィール情報を組み立てて返す
        return c.json({
            sub: parsedPayload.sub,
            name: USER_NAMES[parsedPayload.sub ?? ""] ?? null,
            scope: parsedPayload.scope,
        });
    });
};
