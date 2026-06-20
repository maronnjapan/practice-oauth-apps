import { fetchMock } from "cloudflare:test"
import { fetchTestApplication } from "./utils"

// 外部へのfetch（トークンエンドポイント呼び出し）をモックするための設定
beforeAll(() => {
    fetchMock.activate()
    fetchMock.disableNetConnect()
})
afterEach(() => {
    fetchMock.assertNoPendingInterceptors()
})

describe('client-app', () => {
    // ケース1：ホーム画面
    it('ホーム画面にフロー開始リンクが表示されること', async () => {
        const res = await fetchTestApplication('/')
        const text = await res.text()

        expect(res.status).toEqual(200)
        expect(text).toContain('/start-authorize')
    })
    // ケース2：認可リクエストURLの組み立て
    it('認可サーバーのauthorizeエンドポイントに必須パラメータ付きでリダイレクトされること', async () => {
        const res = await fetchTestApplication('/start-authorize')
        const location = res.headers.get('location')!
        const url = new URL(location)

        expect(res.status).toEqual(302)
        expect(`${url.origin}${url.pathname}`).toEqual('http://localhost:8787/authorize')
        expect(url.searchParams.get('client_id')).toEqual('test-client-id')
        expect(url.searchParams.get('redirect_uri')).toEqual('http://localhost:8788/callback')
        expect(url.searchParams.get('response_type')).toEqual('code')
        expect(url.searchParams.get('scope')).toEqual('read:profile')
    })
    // ケース3：codeなしコールバック
    it('クエリにcodeが存在しない場合、エラー画面が表示されること', async () => {
        const res = await fetchTestApplication('/callback')

        expect(res.status).toEqual(400)
    })
})

describe('state', () => {
    // ケース1：認可リクエストURLへのstate付与
    it('認可リクエストURLにstateパラメータが含まれること', async () => {
        const res = await fetchTestApplication('/start-authorize')
        const url = new URL(res.headers.get('location')!)

        expect(res.status).toEqual(302)
        // stateはランダム値なので、存在と形式を確認する
        expect(url.searchParams.get('state')).toMatch(/^[a-zA-Z0-9]+$/)
    })
    // ケース2：stateのCookie保存
    it('stateを保存したCookieがSet-Cookieヘッダーで返されること', async () => {
        const res = await fetchTestApplication('/start-authorize')
        const url = new URL(res.headers.get('location')!)
        const setCookie = res.headers.get('set-cookie')!

        // Cookieに保存された値とURLに付与された値が同じであること
        const cookieState = setCookie.match(/oauth_state=([^;]+)/)?.[1]
        expect(cookieState).toEqual(url.searchParams.get('state'))
        expect(setCookie).toContain('HttpOnly')
    })
    // ケース3：stateの一致
    it('Cookieのstateとクエリのstateが一致する場合、トークン取得処理が実行されること', async () => {
        // トークンエンドポイントへのfetchをモックして成功レスポンスを返す
        fetchMock.get('http://localhost:8787')
            .intercept({ path: '/token', method: 'POST' })
            .reply(200, {
                access_token: 'test-access-token',
                token_type: 'Bearer',
                expires_in: 3600,
                scope: 'read:profile'
            })

        const res = await fetchTestApplication('/callback?code=test-code&state=test-state', {
            // クエリと同じstateをCookieにもセットする
            headers: { Cookie: 'oauth_state=test-state; code_verifier=test-verifier' }
        })
        const text = await res.text()

        expect(res.status).toEqual(200)
        expect(text).toContain('アクセストークンを取得しました')
    })
    // ケース4：stateの不一致
    it('Cookieのstateとクエリのstateが一致しない場合、エラー画面が表示されること', async () => {
        const res = await fetchTestApplication('/callback?code=test-code&state=attacker-state', {
            headers: { Cookie: 'oauth_state=valid-state; code_verifier=test-verifier' }
        })

        expect(res.status).toEqual(400)
    })
})

describe('PKCE', () => {
    // ケース5：code_challengeの付与
    it('認可リクエストURLにcode_challengeとcode_challenge_methodが含まれること', async () => {
        const res = await fetchTestApplication('/start-authorize')
        const url = new URL(res.headers.get('location')!)

        // code_challengeはBase64URL形式（43文字）であること
        expect(url.searchParams.get('code_challenge')).toMatch(/^[a-zA-Z0-9_-]{43}$/)
        expect(url.searchParams.get('code_challenge_method')).toEqual('S256')
        // code_verifier自体もCookieに保存されていること
        expect(res.headers.get('set-cookie')).toContain('code_verifier=')
    })
})
