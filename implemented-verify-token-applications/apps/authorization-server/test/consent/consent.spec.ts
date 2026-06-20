import { env } from "cloudflare:test"
import { fetchTestApplication, createSessionCookie } from "../utils"

// テストで使う認可リクエスト情報をKVに事前投入するヘルパー
const TEST_REDIRECT_URI = 'https://example.com/callback'
const TEST_SCOPE = 'read:profile'
const TEST_CLIENT_ID = 'test-client-id'
const setUpAuthorizeRequest = async (dynamicPath: string) => {
    await env.MY_KV_NAMESPACE.put(dynamicPath, JSON.stringify({
        scope: TEST_SCOPE,
        clientId: TEST_CLIENT_ID,
        redirectUri: TEST_REDIRECT_URI,
        responseType: 'code'
    }), { expirationTtl: 300 })
}

// CSRFトークンをKVに事前投入するヘルパー
const setUpCsrfToken = async (dynamicPath: string, csrfToken: string) => {
    await env.MY_KV_NAMESPACE.put(`csrf:${dynamicPath}`, csrfToken, { expirationTtl: 300 })
}

// 同意・拒否のPOSTリクエストを組み立てるヘルパー
const postConsent = async (dynamicPath: string, body: Record<string, string>, cookie?: string) => {
    return await fetchTestApplication(`/consent/${dynamicPath}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            ...(cookie ? { Cookie: cookie } : {})
        },
        body: new URLSearchParams(body)
    })
}

describe('GET /consent/:dynamicPath', () => {
    describe('検証が成功した場合のテストケース', () => {
        // ケース1：スコープが表示されること
        it('リクエストされたスコープとCSRFトークンを含む同意画面が表示されること', async () => {
            const dynamicPath = 'test-dynamic-path'
            await setUpAuthorizeRequest(dynamicPath)
            const sessionCookie = createSessionCookie('user-001')

            const res = await fetchTestApplication(`/consent/${dynamicPath}`, {
                headers: { Cookie: sessionCookie }
            })
            const text = await res.text()

            expect(res.status).toEqual(200)
            expect(text).toContain('read:profile')
            expect(text).toContain('name="csrf_token"')
        })
    })

    describe('検証が失敗した場合のテストケース', () => {
        // ケース2：KVエントリが存在しない
        it('動的パスに対応する値が存在しない場合、エラー画面が表示されること', async () => {
            const sessionCookie = createSessionCookie('user-001')
            const res = await fetchTestApplication('/consent/not-exist-path', {
                headers: { Cookie: sessionCookie }
            })

            expect(res.status).toEqual(400)
        })
        // ケース3：セッションがない
        it('セッションCookieが存在しない場合、ログイン画面にリダイレクトされること', async () => {
            const dynamicPath = 'test-dynamic-path'
            await setUpAuthorizeRequest(dynamicPath)

            const res = await fetchTestApplication(`/consent/${dynamicPath}`)

            expect(res.status).toEqual(302)
            expect(res.headers.get('location')).toEqual(`/login?redirect=/consent/${dynamicPath}`)
        })
    })
})

describe('POST /consent/:dynamicPath', () => {
    describe('検証が成功した場合のテストケース', () => {
        // ケース4：同意で認可コード付きリダイレクト
        it('同意した場合、認可コードを付与してredirect_uriにリダイレクトされること', async () => {
            const dynamicPath = 'test-dynamic-path'
            const csrfToken = 'test-csrf-token'
            await setUpAuthorizeRequest(dynamicPath)
            await setUpCsrfToken(dynamicPath, csrfToken)
            const sessionCookie = createSessionCookie('user-001')

            const res = await postConsent(dynamicPath, { consent: 'yes', csrf_token: csrfToken }, sessionCookie)
            const location = res.headers.get('location')!

            expect(res.status).toEqual(302)
            expect(location).toMatch(new RegExp(`^${TEST_REDIRECT_URI}\\?code=[a-zA-Z0-9]+$`))
        })
        // ケース5：認可コードのKV保存と元KVの削除
        it('同意した場合、認可コードがKVに保存され、元の認可リクエストの値が削除されること', async () => {
            const dynamicPath = 'test-dynamic-path'
            const csrfToken = 'test-csrf-token'
            await setUpAuthorizeRequest(dynamicPath)
            await setUpCsrfToken(dynamicPath, csrfToken)
            const sessionCookie = createSessionCookie('user-001')

            const res = await postConsent(dynamicPath, { consent: 'yes', csrf_token: csrfToken }, sessionCookie)
            const location = res.headers.get('location')!
            const code = new URL(location).searchParams.get('code')!

            // 認可コードをキーに同意の事実が保存されていること
            const savedCode = await env.MY_KV_NAMESPACE.get(code)
            expect(JSON.parse(savedCode!)).toEqual({
                userId: 'user-001',
                clientId: TEST_CLIENT_ID,
                redirectUri: TEST_REDIRECT_URI,
                scope: TEST_SCOPE
            })
            // 元の認可リクエストKVが削除されていること
            const originalValue = await env.MY_KV_NAMESPACE.get(dynamicPath)
            expect(originalValue).toBeNull()
        })
    })

    describe('検証が失敗した場合のテストケース', () => {
        // ケース6：拒否でaccess_deniedリダイレクト
        it('拒否した場合、エラークエリを付与してredirect_uriにリダイレクトされること', async () => {
            const dynamicPath = 'test-dynamic-path'
            const csrfToken = 'test-csrf-token'
            await setUpAuthorizeRequest(dynamicPath)
            await setUpCsrfToken(dynamicPath, csrfToken)
            const sessionCookie = createSessionCookie('user-001')

            const res = await postConsent(dynamicPath, { consent: 'no', csrf_token: csrfToken }, sessionCookie)

            expect(res.status).toEqual(302)
            expect(res.headers.get('location')).toEqual(`${TEST_REDIRECT_URI}?error=access_denied`)
        })
        // ケース7：CSRFトークン不正
        it('CSRFトークンが一致しない場合、エラー画面が表示されること', async () => {
            const dynamicPath = 'test-dynamic-path'
            await setUpAuthorizeRequest(dynamicPath)
            await setUpCsrfToken(dynamicPath, 'valid-csrf-token')
            const sessionCookie = createSessionCookie('user-001')

            const res = await postConsent(dynamicPath, { consent: 'yes', csrf_token: 'invalid-csrf-token' }, sessionCookie)

            expect(res.status).toEqual(400)
        })
    })
})

describe('PKCE', () => {
    // ケース6：code_challengeが認可コードに引き継がれること
    it('PKCE付きの認可リクエストに同意した場合、認可コードにcode_challengeが紐づいて保存されること', async () => {
        const dynamicPath = 'test-dynamic-path-pkce'
        const csrfToken = 'test-csrf-token'
        // 第4章の/authorizeがPKCE付きで保存する形式を再現する
        await env.MY_KV_NAMESPACE.put(dynamicPath, JSON.stringify({
            scope: TEST_SCOPE,
            clientId: TEST_CLIENT_ID,
            redirectUri: TEST_REDIRECT_URI,
            responseType: 'code',
            pkce: {
                code_challenge: 'test-code-challenge',
                code_challenge_method: 'S256'
            }
        }), { expirationTtl: 300 })
        await setUpCsrfToken(dynamicPath, csrfToken)
        const sessionCookie = createSessionCookie('user-001')

        const res = await postConsent(dynamicPath, { consent: 'yes', csrf_token: csrfToken }, sessionCookie)
        const code = new URL(res.headers.get('location')!).searchParams.get('code')!

        const savedCode = JSON.parse((await env.MY_KV_NAMESPACE.get(code))!)
        // code_challengeとcode_challenge_methodが認可コードに引き継がれていること
        expect(savedCode.pkce).toEqual({
            code_challenge: 'test-code-challenge',
            code_challenge_method: 'S256'
        })
    })
})
