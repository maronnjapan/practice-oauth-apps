import { env, fetchMock } from "cloudflare:test"
import { fetchTestApplication } from "../utils"

// 外部へのfetch（JWKS取得）をモックするための設定
beforeAll(() => {
    fetchMock.activate()
    fetchMock.disableNetConnect()
})

const encodeBase64Url = (input: string) => {
    return btoa(input).replace(/\/|\+/g, (m) => ({ '/': '_', '+': '-' }[m] ?? m)).replace(/=/g, '')
}

// テスト用のJWTを生成するヘルパー
// payloadOverridesでクレームを上書きすることで、異常系のJWTも柔軟に作れる
const createTestJwt = async (payloadOverrides: Record<string, unknown> = {}) => {
    const privateKey = await crypto.subtle.importKey(
        'jwk',
        JSON.parse(env.PRIVATE_KEY),
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false,
        ['sign']
    )
    const header = { alg: 'RS256', typ: 'at+jwt', kid: '1' }
    const now = Math.floor(Date.now() / 1000)
    const payload = {
        iss: 'http://localhost:8787',
        sub: 'user-001',
        aud: 'http://localhost:8789/api',
        client_id: 'test-client-id',
        scope: 'read:profile',
        exp: now + 3600,
        iat: now,
        jti: 'test-jti',
        ...payloadOverrides
    }
    const signTarget = `${encodeBase64Url(JSON.stringify(header))}.${encodeBase64Url(JSON.stringify(payload))}`
    const sign = await crypto.subtle.sign(
        { name: 'RSASSA-PKCS1-v1_5' },
        privateKey,
        new TextEncoder().encode(signTarget)
    )
    return `${signTarget}.${encodeBase64Url(String.fromCharCode(...new Uint8Array(sign)))}`
}

describe('/api/profile', () => {
    beforeEach(() => {
        // リソースサーバーが取得するJWKSをモックする
        // テスト用秘密鍵に対応する公開鍵を返すことで、署名検証が成立する
        fetchMock.get('http://localhost:8787')
            .intercept({ path: '/.well-known/jwks.json', method: 'GET' })
            .reply(200, {
                keys: [{
                    ...JSON.parse(env.PUBLIC_KEY),
                    kid: '1',
                    use: 'sig',
                    alg: 'RS256'
                }]
            })
            .persist()
    })

    describe('検証が成功した場合のテストケース', () => {
        // ケース6：正常系
        it('有効なアクセストークンの場合、プロフィール情報が返ること', async () => {
            const jwt = await createTestJwt()
            const res = await fetchTestApplication('/api/profile', {
                headers: { Authorization: `Bearer ${jwt}` }
            })

            expect(res.status).toEqual(200)
            const profile = await res.json()
            expect(profile).toEqual({
                sub: 'user-001',
                name: 'テストユーザー',
                scope: 'read:profile'
            })
        })
    })

    describe('検証が失敗した場合のテストケース', () => {
        // ケース7：Authorizationヘッダーなし
        it('Authorizationヘッダーが存在しない場合、エラーとすること', async () => {
            const res = await fetchTestApplication('/api/profile')

            expect(res.status).toEqual(401)
            expect(res.headers.get('www-authenticate')).toEqual('Bearer')
        })
        // ケース8：署名の改ざん
        it('署名が改ざんされたトークンの場合、エラーとすること', async () => {
            const jwt = await createTestJwt()
            // 署名部分の末尾を書き換えて改ざんトークンを作る
            const tamperedJwt = jwt.slice(0, -4) + 'AAAA'

            const res = await fetchTestApplication('/api/profile', {
                headers: { Authorization: `Bearer ${tamperedJwt}` }
            })

            expect(res.status).toEqual(401)
        })
        // ケース9：有効期限切れ
        it('有効期限が切れたトークンの場合、エラーとすること', async () => {
            const jwt = await createTestJwt({
                exp: Math.floor(Date.now() / 1000) - 3600 // 1時間前に失効
            })
            const res = await fetchTestApplication('/api/profile', {
                headers: { Authorization: `Bearer ${jwt}` }
            })

            expect(res.status).toEqual(401)
        })
        // ケース10：audの不一致
        it('audが自分宛てでないトークンの場合、エラーとすること', async () => {
            const jwt = await createTestJwt({
                aud: 'https://wrong-resource-server.example.com'
            })
            const res = await fetchTestApplication('/api/profile', {
                headers: { Authorization: `Bearer ${jwt}` }
            })

            expect(res.status).toEqual(401)
        })
        // ケース11：スコープ不足
        it('必要なスコープを含まないトークンの場合、403エラーとすること', async () => {
            const jwt = await createTestJwt({
                scope: 'read:other' // read:profile を含まない別のスコープ
            })
            const res = await fetchTestApplication('/api/profile', {
                headers: { Authorization: `Bearer ${jwt}` }
            })

            expect(res.status).toEqual(403)
            expect(res.headers.get('www-authenticate')).toEqual('Bearer error="insufficient_scope"')
        })
    })
})
