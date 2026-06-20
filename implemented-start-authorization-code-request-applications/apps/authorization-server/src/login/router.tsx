import { setCookie } from 'hono/cookie'
import app from "..";
import { Login } from "./components/Login";

/**
 * 本書ではユーザー管理を実装しないため、デモユーザーをハードコードする
 * 実際のサービスではDBでユーザーを管理し、パスワードはハッシュ化して保存すること
 */
const DEMO_USER = {
    id: "user-001",
    name: "テストユーザー",
    email: "test@example.com",
} as const

const DEMO_USERNAME = "testuser"
const DEMO_PASSWORD = "password"

export const setUpLoginRoute = (baseApp: typeof app) => {
    baseApp.get('/login', async (c) => {
        // ログイン後に戻る先をクエリから受け取り、フォームに引き継ぐ
        const redirect = c.req.query('redirect') || ''
        return c.html(<Login redirect={redirect} />)
    })

    baseApp.post('/login', async (c) => {
        // フォームボディから各値を取得
        const requestBody = await c.req.parseBody()
        const username = requestBody['username']
        const password = requestBody['password']
        const redirect = requestBody['redirect']

        /**
         * オープンリダイレクト防止のため、リダイレクト先は同意画面のパスのみ許可する
         * 外部URLを指定された場合はエラーにする
         */
        if (typeof redirect !== 'string' || !redirect.startsWith('/consent/')) {
            return c.html(<div>不正なリクエストです</div>, 400)
        }

        /**
         * デモユーザーの資格情報と照合する
         * どちらが間違っているかを攻撃者に伝えないため、エラーメッセージは共通にする
         */
        if (username !== DEMO_USERNAME || password !== DEMO_PASSWORD) {
            return c.html(<Login redirect={redirect} errorMessage="ユーザー名またはパスワードが正しくありません" />, 401)
        }

        /**
         * 認証に成功したのでセッションCookieを発行する。
         * 本来はCookieに推測不可能なセッションIDだけを入れ、ユーザーIDなどの中身はサーバー側（KVやD1）に
         * 保存してセッションIDをキーに引くのが一般的。ここでは検証用の最小実装として、ユーザーIDを直接Cookieに入れている。
         * （改ざんを検出したい場合はHonoのsetSignedCookieを使う選択肢もあるが、本書では簡潔さを優先して使わない）
         */
        setCookie(c, 'session', DEMO_USER.id, {
            httpOnly: true,
            secure: true,
            sameSite: 'Lax',
            path: '/',
            maxAge: 3600, // 1時間で自動失効
        })
        return c.redirect(redirect)
    })
}
