import { getCookie } from 'hono/cookie'
import app from "..";
import { AuthorizeRequestValue } from "../authorize/types";
import { AuthorizationCodeValue } from "./types";
import { Consent } from "./components/Consent";

export const setUpConsentRoute = (baseApp: typeof app) => {
    baseApp.get('/consent/:dynamicPath', async (c) => {
        // リクエストのURLから動的パス部分を取得
        const { dynamicPath } = c.req.param()
        // 動的パスをキーにしてKVから保存されている値を取得
        const authorizeRequestValue = await c.env.MY_KV_NAMESPACE.get(dynamicPath)
        // 保存されている値が存在しない場合、エラー画面を表示
        if (!authorizeRequestValue) {
            return c.html(<div>不正なアクセスです</div>, 400)
        }
        // 未認証の場合、ログイン画面にリダイレクトする
        const session = getCookie(c, 'session')
        if (!session) {
            return c.redirect(`/login?redirect=/consent/${dynamicPath}`)
        }
        try {
            const value = JSON.parse(authorizeRequestValue) as AuthorizeRequestValue
            /**
             * CSRFトークンを生成してKVに保存し、フォームのhiddenフィールドに埋め込む
             * POST時に保存値と照合することで、この画面以外からのフォーム送信を拒否する
             */
            const csrfToken = crypto.randomUUID().replaceAll('-', '')
            await c.env.MY_KV_NAMESPACE.put(`csrf:${dynamicPath}`, csrfToken, { expirationTtl: 300 })
            // 保存されているscopeの値を同意画面に渡して表示
            return c.html(
                <Consent scope={value.scope} clientId={value.clientId} id={dynamicPath} csrfToken={csrfToken} />
            )
        } catch {
            // JSONのパースに失敗した場合、不正な値が保存されていたのでエラー画面を表示
            return c.html(<div>不正なアクセスです</div>, 400)
        }
    })

    baseApp.post('/consent/:dynamicPath', async (c) => {
        // リクエストパスから動的部分を取得
        const { dynamicPath } = c.req.param()
        // 各種リクエストボディの値を取得
        const requestBody = await c.req.parseBody()
        const consentValue = requestBody['consent']
        const csrfToken = requestBody['csrf_token']

        /**
         * CSRFトークンを検証する
         * 同意画面の表示時に保存した値と一致しない場合、同意画面以外から送信されたリクエストなので拒否する
         */
        const savedCsrfToken = await c.env.MY_KV_NAMESPACE.get(`csrf:${dynamicPath}`)
        if (!savedCsrfToken || savedCsrfToken !== csrfToken) {
            return c.html(<div>不正なリクエストです</div>, 400)
        }
        // 検証済みのCSRFトークンは使い捨てなので削除する
        await c.env.MY_KV_NAMESPACE.delete(`csrf:${dynamicPath}`)

        // Authorization Code開始リクエスト時の紐づけが残っているかを確認
        const authorizeRequestValue = await c.env.MY_KV_NAMESPACE.get(dynamicPath)
        if (!authorizeRequestValue) {
            return c.html(<div>不正なリクエストです</div>, 400)
        }
        const authorizeRequestJson = JSON.parse(authorizeRequestValue) as AuthorizeRequestValue

        /**
         * 拒否された場合、エラークエリを付与してredirect_uriにリダイレクトする
         * 拒否もユーザーの正当な意思表示なので、結果をクライアントに伝える
         */
        if (consentValue !== 'yes') {
            await c.env.MY_KV_NAMESPACE.delete(dynamicPath)
            const url = new URL(authorizeRequestJson.redirectUri)
            url.searchParams.set('error', 'access_denied')
            return c.redirect(url.toString())
        }

        // 同意したユーザーを特定するため、セッションCookieからユーザーIDを取得する
        const userId = getCookie(c, 'session')
        if (!userId) {
            return c.redirect(`/login?redirect=/consent/${dynamicPath}`)
        }

        /**
         * 検証がOKであれば、認可コードを発行する
         * 「誰が・どのクライアントに・どの権限を」許可したかを認可コードに紐づけて保存する
         */
        const code = crypto.randomUUID().replaceAll('-', '')
        const codeValue: AuthorizationCodeValue = {
            userId,
            clientId: authorizeRequestJson.clientId,
            redirectUri: authorizeRequestJson.redirectUri,
            scope: authorizeRequestJson.scope,
        }
        await c.env.MY_KV_NAMESPACE.put(code,
            JSON.stringify(codeValue)
            , { expirationTtl: 600 }) // 10分間保存
        await c.env.MY_KV_NAMESPACE.delete(dynamicPath) // 使い捨てなので削除する

        // redirect_uriのクエリに認可コードを付与してリダイレクトする
        const url = new URL(authorizeRequestJson.redirectUri)
        url.searchParams.set('code', code)
        return c.redirect(url.toString())
    })
}
