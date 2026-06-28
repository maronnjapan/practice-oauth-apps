import app from ".."
import { AuthorizationCodeValue } from "../consent/types"

// Base64URL形式（+→-、/→_、パディングなし）にエンコードする
const encodeBase64Url = (input: string) => {
    return btoa(input).replace(/\/|\+/g, (m) => ({ '/': '_', '+': '-' }[m] ?? m)).replace(/=/g, '')
}

export const setUpTokenRoute = (baseApp: typeof app) => {
    baseApp.post('/token', async (c) => {
        /**
         * トークンリクエストのボディはapplication/x-www-form-urlencoded形式と仕様で定められている
         * それ以外の形式は受け付けない
         */
        const contentType = c.req.header('Content-Type') || ''
        if (!contentType.includes('application/x-www-form-urlencoded')) {
            return c.json({
                error: 'invalid_request',
                error_description: 'Content-Type is invalid'
            }, 400)
        }

        // リクエストボディから各値を取得
        const requestBody = await c.req.parseBody()
        const clientId = requestBody['client_id']
        const clientSecret = requestBody['client_secret']
        const grantType = requestBody['grant_type']
        const code = requestBody['code']
        const redirectUri = requestBody['redirect_uri']
        const codeVerifier = requestBody['code_verifier']

        /**
         * クライアント認証（client_secret_post）
         * client_idに一致するクライアントをDBから取得し、client_secretを照合する
         * どちらが間違っているかを攻撃者に伝えないため、エラーは共通のinvalid_clientとする
         */
        if (typeof clientId !== 'string' || typeof clientSecret !== 'string') {
            return c.json({
                error: 'invalid_client',
                error_description: 'Client authentication failed'
            }, 401)
        }
        const prisma = c.get('prisma')
        const client = await prisma.client.findUnique({
            where: { clientId },
        })
        if (!client || client.clientSecret !== clientSecret) {
            return c.json({
                error: 'invalid_client',
                error_description: 'Client authentication failed'
            }, 401)
        }

        // 本書はAuthorization Code Flowのみをサポートするため、grant_typeはauthorization_codeに限定する
        if (grantType !== 'authorization_code') {
            return c.json({
                error: 'unsupported_grant_type',
                error_description: 'grant_type is invalid'
            }, 400)
        }

        // 認可コードに紐づく情報をKVから取得し、検証する
        if (!code || typeof code !== 'string') {
            return c.json({
                error: 'invalid_grant',
                error_description: 'Authorization code is invalid'
            }, 400)
        }
        const authorizationCodeValue = await c.env.MY_KV_NAMESPACE.get(code)
        if (!authorizationCodeValue) {
            return c.json({
                error: 'invalid_grant',
                error_description: 'Authorization code is invalid'
            }, 400)
        }
        const codeJson = JSON.parse(authorizationCodeValue) as AuthorizationCodeValue
        // 認可コードが認証済みのクライアントに対して発行されたものか確認する
        if (codeJson.clientId !== clientId) {
            return c.json({
                error: 'invalid_grant',
                error_description: 'Authorization code is invalid'
            }, 400)
        }
        // 認可リクエスト時のredirect_uriとトークンリクエストのredirect_uriが一致するか確認する
        if (codeJson.redirectUri !== redirectUri) {
            return c.json({
                error: 'invalid_grant',
                error_description: 'redirect_uri is invalid'
            }, 400)
        }

        // PKCEを使用している場合、code_verifierの検証を行う
        if (codeJson.pkce) {
            if (!codeVerifier || typeof codeVerifier !== 'string') {
                return c.json({
                    error: 'invalid_grant',
                    error_description: 'code_verifier is missing'
                }, 400)
            }
            // code_verifierをSHA-256でハッシュ化し、Base64URLエンコードする
            const hashed = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(codeVerifier))
            const base64UrlEncoded = encodeBase64Url(String.fromCharCode(...new Uint8Array(hashed)))
            // 算出した値と保存済みのcode_challengeが一致しない場合、エラー
            if (base64UrlEncoded !== codeJson.pkce.code_challenge) {
                return c.json({
                    error: 'invalid_grant',
                    error_description: 'code_verifier is invalid'
                }, 400)
            }
        }

        /**
         * ここまで到達した場合、検証が成功したことになるので、アクセストークンを発行する
         * アクセストークンはJWT形式とし、RS256で署名する
         */
        const privateKey = await crypto.subtle.importKey(
            "jwk",
            JSON.parse(c.env.PRIVATE_KEY),
            {
                name: 'RSASSA-PKCS1-v1_5',
                hash: 'SHA-256'
            },
            false,
            ["sign"]
        )

        // JWT用のヘッダーとペイロードを作成
        const tokenHeader = {
            alg: 'RS256',
            typ: 'at+jwt',
            kid: '1'
        }
        const now = Math.floor(Date.now() / 1000)
        const tokenPayload = {
            iss: c.env.ISSUER,
            sub: codeJson.userId,
            aud: c.env.RESOURCE_SERVER_IDENTIFIER,
            client_id: codeJson.clientId,
            scope: codeJson.scope,
            exp: now + 3600, // 1時間で失効
            iat: now,
            jti: crypto.randomUUID().replaceAll('-', '')
        }

        // ヘッダーとペイロードをBase64URLエンコードして連結し、署名を生成する
        const signTarget = `${encodeBase64Url(JSON.stringify(tokenHeader))}.${encodeBase64Url(JSON.stringify(tokenPayload))}`
        const sign = await crypto.subtle.sign(
            { name: 'RSASSA-PKCS1-v1_5' },
            privateKey,
            new TextEncoder().encode(signTarget)
        )
        const accessToken = `${signTarget}.${encodeBase64Url(String.fromCharCode(...new Uint8Array(sign)))}`

        await c.env.MY_KV_NAMESPACE.delete(code) // 認可コードは使い捨てなので削除する

        /**
         * トークンレスポンスを返す
         * トークンを含むレスポンスがキャッシュされないよう、Cache-Control: no-storeとPragma: no-cacheを付与する
         */
        return c.json({
            access_token: accessToken,
            token_type: 'Bearer',
            expires_in: 3600,
            scope: codeJson.scope
        }, 200, {
            'Cache-Control': 'no-store',
            'Pragma': 'no-cache'
        })
    })
}
