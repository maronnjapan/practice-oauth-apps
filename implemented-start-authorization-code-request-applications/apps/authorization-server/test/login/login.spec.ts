import { fetchTestApplication } from "../utils"
import { defineUserFactory } from "../../src/generated/fabbrica"

const userFactory = defineUserFactory()
const TEST_USER = {
    id: 'user-001',
    username: 'testuser',
    password: 'password123',
} as const

describe('/login', () => {
    beforeAll(async () => {
        await userFactory.create(TEST_USER)
    })

    describe('検証が成功した場合のテストケース', () => {
        // ケース1：ログインフォームの表示
        it('ログインフォームを含むHTMLが返ること', async () => {
            const res = await fetchTestApplication('/login?redirect=/consent/test-dynamic-path')
            const text = await res.text()

            expect(res.status).toEqual(200)
            expect(text).toContain('<form')
            expect(text).toContain('name="username"')
            expect(text).toContain('name="password"')
            // redirectクエリの値がhiddenフィールドに引き継がれていること
            expect(text).toContain('value="/consent/test-dynamic-path"')
        })
        // ケース2：ログイン成功
        it('正しい資格情報を送ると、セッションCookieが設定されredirect先にリダイレクトされること', async () => {
            const body = new URLSearchParams({
                username: TEST_USER.username,
                password: TEST_USER.password,
                redirect: '/consent/test-dynamic-path'
            })
            const res = await fetchTestApplication('/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body
            })
            const setCookie = res.headers.get('set-cookie')!

            expect(res.status).toEqual(302)
            expect(res.headers.get('location')).toEqual('/consent/test-dynamic-path')
            expect(setCookie).toContain(`session=${TEST_USER.id}`)
            expect(setCookie).toContain('HttpOnly')
            expect(setCookie).toContain('Secure')
            expect(setCookie).toContain('SameSite=Lax')
            expect(setCookie).toContain('Max-Age=3600')
        })
    })

    describe('検証が失敗した場合のテストケース', () => {
        // ケース3：認証失敗
        it('パスワードが正しくない場合、401エラーが返ること', async () => {
            const body = new URLSearchParams({
                username: TEST_USER.username,
                password: 'invalid-password',
                redirect: '/consent/test-dynamic-path'
            })
            const res = await fetchTestApplication('/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body
            })
            const text = await res.text()

            expect(res.status).toEqual(401)
            expect(text).toContain('ユーザー名またはパスワードが正しくありません')
            // 認証失敗時にセッションCookieが発行されないこと
            expect(res.headers.get('set-cookie')).toBeNull()
        })
        // ケース4：オープンリダイレクト防止
        it('redirectの値が同意画面のパス以外の場合、400エラーが返ること', async () => {
            const body = new URLSearchParams({
                username: TEST_USER.username,
                password: TEST_USER.password,
                redirect: 'https://evil.example.com'
            })
            const res = await fetchTestApplication('/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body
            })

            expect(res.status).toEqual(400)
        })
    })
})
