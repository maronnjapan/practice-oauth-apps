import { env } from "cloudflare:test"
import { fetchTestApplication } from "../utils"
import { defineClientFactory } from "../../src/generated/fabbrica"
import { AuthorizationCodeValue } from "../../src/consent/types"

const clientFactory = defineClientFactory()

const TEST_REDIRECT_URI = 'https://example.com/callback'
const TEST_SCOPE = 'read:profile'

// 認可コードをKVに事前投入するヘルパー
const setUpAuthorizationCode = async (code: string, clientId: string) => {
    const codeValue: AuthorizationCodeValue = {
        userId: 'user-001',
        clientId,
        redirectUri: TEST_REDIRECT_URI,
        scope: TEST_SCOPE,
    }
    await env.MY_KV_NAMESPACE.put(code, JSON.stringify(codeValue), { expirationTtl: 600 })
}

// client_secret_post形式のトークンリクエストを送るヘルパー
const postToken = async (params: Record<string, string>, contentType = 'application/x-www-form-urlencoded') => {
    return await fetchTestApplication('/token', {
        method: 'POST',
        headers: { 'Content-Type': contentType },
        body: new URLSearchParams(params).toString(),
    })
}

// Base64URL形式の文字列をデコードする
const decodeBase64Url = (str: string) => atob(str.replace(/-/g, '+').replace(/_/g, '/'))

describe('/token', () => {
    describe('検証が成功した場合のテストケース', () => {
        // ケース1：トークンレスポンスの形式
        it('リクエストが適切な場合、アクセストークンが発行されること', async () => {
            const client = await clientFactory.create()
            const code = 'test-code'
            await setUpAuthorizationCode(code, client.clientId)

            const tokenRes = await postToken({
                grant_type: 'authorization_code',
                code,
                redirect_uri: TEST_REDIRECT_URI,
                client_id: client.clientId,
                client_secret: client.clientSecret,
            })

            expect(tokenRes.status).toEqual(200)
            expect(tokenRes.headers.get('cache-control')).toEqual('no-store')
            expect(tokenRes.headers.get('pragma')).toEqual('no-cache')
            const tokenJson = await tokenRes.json() as Record<string, unknown>
            expect(tokenJson).toHaveProperty('access_token')
            expect(tokenJson).toHaveProperty('token_type', 'Bearer')
            expect(tokenJson).toHaveProperty('expires_in', 3600)
            expect(tokenJson).toHaveProperty('scope', TEST_SCOPE)
        })
        // ケース2：JWTの形式とペイロードのクレーム
        it('アクセストークンがJWT形式であり、ペイロードに必要なクレームが含まれること', async () => {
            const client = await clientFactory.create()
            const code = 'test-code-for-jwt'
            await setUpAuthorizationCode(code, client.clientId)

            const tokenRes = await postToken({
                grant_type: 'authorization_code',
                code,
                redirect_uri: TEST_REDIRECT_URI,
                client_id: client.clientId,
                client_secret: client.clientSecret,
            })
            const tokenJson = await tokenRes.json() as { access_token: string }

            // ヘッダー・ペイロード・署名の3パートで構成されていること
            const parts = (tokenJson.access_token as string).split('.')
            expect(parts).toHaveLength(3)

            // ヘッダーの検証
            const header = JSON.parse(decodeBase64Url(parts[0]))
            expect(header).toEqual({ alg: 'RS256', typ: 'at+jwt', kid: '1' })

            // ペイロードの検証
            const payload = JSON.parse(decodeBase64Url(parts[1]))
            expect(payload.iss).toEqual('http://localhost:8787')
            expect(payload.sub).toEqual('user-001')
            expect(payload.aud).toEqual('http://localhost:8789/api')
            expect(payload.client_id).toEqual(client.clientId)
            expect(payload.scope).toEqual(TEST_SCOPE)
            expect(payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000))
            expect(payload.iat).toBeLessThanOrEqual(Math.floor(Date.now() / 1000))
            expect(payload.jti).toEqual(expect.any(String))
        })
    })

    describe('検証が失敗した場合のテストケース', () => {
        // ケース3：Content-Typeが不正
        it('Content-Typeがapplication/x-www-form-urlencodedでない場合、エラーとすること', async () => {
            const client = await clientFactory.create()
            const code = 'test-code-for-content-type'
            await setUpAuthorizationCode(code, client.clientId)

            const tokenRes = await postToken({
                grant_type: 'authorization_code',
                code,
                redirect_uri: TEST_REDIRECT_URI,
                client_id: client.clientId,
                client_secret: client.clientSecret,
            }, 'application/json')

            expect(tokenRes.status).toEqual(400)
            const tokenJson = await tokenRes.json()
            expect(tokenJson).toHaveProperty('error', 'invalid_request')
        })
        // ケース4：grant_typeが不正
        it('grant_typeがauthorization_codeでない場合、エラーとすること', async () => {
            const client = await clientFactory.create()
            const code = 'test-code-for-grant-type'
            await setUpAuthorizationCode(code, client.clientId)

            const tokenRes = await postToken({
                grant_type: 'invalid-grant-type',
                code,
                redirect_uri: TEST_REDIRECT_URI,
                client_id: client.clientId,
                client_secret: client.clientSecret,
            })

            expect(tokenRes.status).toEqual(400)
            const tokenJson = await tokenRes.json()
            expect(tokenJson).toHaveProperty('error', 'unsupported_grant_type')
        })
        // ケース5：クライアントが存在しない
        it('client_idに一致するクライアントが存在しない場合、エラーとすること', async () => {
            const tokenRes = await postToken({
                grant_type: 'authorization_code',
                code: 'some-code',
                redirect_uri: TEST_REDIRECT_URI,
                client_id: 'invalid-client-id',
                client_secret: 'invalid-client-secret',
            })

            expect(tokenRes.status).toEqual(401)
            const tokenJson = await tokenRes.json()
            expect(tokenJson).toHaveProperty('error', 'invalid_client')
        })
        // ケース6：client_secretが不正
        it('client_secretが一致しない場合、エラーとすること', async () => {
            const client = await clientFactory.create()
            const tokenRes = await postToken({
                grant_type: 'authorization_code',
                code: 'some-code',
                redirect_uri: TEST_REDIRECT_URI,
                client_id: client.clientId,
                client_secret: 'invalid-client-secret',
            })

            expect(tokenRes.status).toEqual(401)
            const tokenJson = await tokenRes.json()
            expect(tokenJson).toHaveProperty('error', 'invalid_client')
        })
        // ケース7：認可コードが存在しない
        it('認可コードに紐づく情報が存在しない場合、エラーとすること', async () => {
            const client = await clientFactory.create()
            const tokenRes = await postToken({
                grant_type: 'authorization_code',
                code: 'non-existent-code',
                redirect_uri: TEST_REDIRECT_URI,
                client_id: client.clientId,
                client_secret: client.clientSecret,
            })

            expect(tokenRes.status).toEqual(400)
            const tokenJson = await tokenRes.json()
            expect(tokenJson).toHaveProperty('error', 'invalid_grant')
        })
        // ケース8：認可コードの再利用
        it('同じ認可コードを2回使用した場合、2回目はエラーとすること', async () => {
            const client = await clientFactory.create()
            const code = 'test-code-for-reuse'
            await setUpAuthorizationCode(code, client.clientId)
            const params = {
                grant_type: 'authorization_code',
                code,
                redirect_uri: TEST_REDIRECT_URI,
                client_id: client.clientId,
                client_secret: client.clientSecret,
            }

            // 1回目は成功すること
            const firstRes = await postToken(params)
            expect(firstRes.status).toEqual(200)

            // 2回目は失敗すること
            const secondRes = await postToken(params)
            expect(secondRes.status).toEqual(400)
            const secondJson = await secondRes.json()
            expect(secondJson).toHaveProperty('error', 'invalid_grant')
        })
    })
})
