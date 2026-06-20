import { fetchTestApplication } from "./utils"

describe('client-app', () => {
    describe('検証が成功した場合のテストケース', () => {
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
        // ケース3：認可コードの受け取り
        it('認可コード付きでコールバックされた場合、受け取り画面が表示されること', async () => {
            const res = await fetchTestApplication('/callback?code=test-authorization-code')
            const text = await res.text()

            expect(res.status).toEqual(200)
            expect(text).toContain('test-authorization-code')
        })
    })

    describe('検証が失敗した場合のテストケース', () => {
        // ケース4：codeなしコールバック
        it('クエリにcodeが存在しない場合、エラー画面が表示されること', async () => {
            const res = await fetchTestApplication('/callback')

            expect(res.status).toEqual(400)
        })
    })
})
