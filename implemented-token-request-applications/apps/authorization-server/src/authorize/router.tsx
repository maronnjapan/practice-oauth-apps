import { getCookie } from 'hono/cookie'
import app from "..";
import { AuthorizeError } from "./components/AuthorizeError";
import { AuthorizeRequestValue } from "./types";

export const setUpAuthorizeRoute = (baseApp: typeof app) => {
    baseApp.get('/authorize', async (c) => {
        // リクエスト内のクエリを取得
        const clientId = c.req.query('client_id') || ''
        const redirectUri = c.req.query('redirect_uri') || ''
        const responseType = c.req.query('response_type') || ''
        const scope = c.req.query('scope') || ''

        /**
         * client_idとredirect_uriが存在しない場合、適切なクライアントからのリクエストか判断できない
         * そのため、エラー画面を表示
         */
        if (!clientId || !redirectUri) {
            return c.html(<AuthorizeError error="invalid_request" description="必要なクエリが存在しません" />, 400)
        }

        /**
         * client_idクエリの値とIDが一致するクライアントを抽出
         */
        const prisma = c.get('prisma')
        const client = await prisma.client.findUnique({
            where: { clientId },
            include: { RedirectUri: true, Scope: true }
        })

        // 一致するクライアントが存在しない場合、エラー画面を表示
        if (!client) {
            return c.html(<AuthorizeError error="unauthorized_client" description="client_idが不正です" />, 400)
        }

        // redirect_uriの値が、クライアントが許可しているredirect_uriと一致しない場合、エラー画面を表示
        if (!client.RedirectUri.some(uri => uri.uri === redirectUri)) {
            return c.html(<AuthorizeError error="invalid_request" description="redirect_uriが不正です" />, 400)
        }

        /**
         * 今回はAuthorization Code Flowのみをサポートするため、response_typeクエリの値がcodeでない場合はエラー
         * ただし、リクエストしてきたクライアント自体は許可しているクライアントなので、redirect_uriクエリの値にリダイレクトし、エラークエリを付与する
         */
        if (responseType !== 'code') {
            const url = new URL(redirectUri)
            url.searchParams.set('error', 'unsupported_response_type')
            return c.redirect(url.toString())
        }

        /**
         * scopeクエリが存在しない場合、エラー
         * ただし、リクエストしてきたクライアント自体は許可しているクライアントなので、redirect_uriクエリの値にリダイレクトし、エラークエリを付与する
         */
        if (!scope) {
            const url = new URL(redirectUri)
            url.searchParams.set('error', 'invalid_request')
            return c.redirect(url.toString())
        }

        /**
         * scopeクエリの値が、保存しているクライアントが許可しているScopeと一致しない場合、エラー
         * ただし、リクエストしてきたクライアント自体は許可しているクライアントなので、redirect_uriクエリの値にリダイレクトし、エラークエリを付与する
         */
        const requestedScopes = scope.split(' ')
        const allowedScopes = client.Scope.map(s => s.name)
        if (!requestedScopes.every(s => allowedScopes.includes(s))) {
            const url = new URL(redirectUri)
            url.searchParams.set('error', 'invalid_scope')
            return c.redirect(url.toString())
        }

        /**
         * ここまで到達した場合、検証が成功したことになる
         * 後続の処理のためにクエリの値を一時的に保存する
         */
        const dynamicPath = crypto.randomUUID().replaceAll('-', '')
        const saveValue: AuthorizeRequestValue = {
            scope,
            clientId,
            redirectUri,
            responseType
        }
        await c.env.MY_KV_NAMESPACE.put(dynamicPath,
            JSON.stringify(saveValue)
            , { expirationTtl: 300 }) // 5分間保存

        /**
         * セッションCookieを確認し、行き先を振り分ける
         * 未認証の場合はログイン画面へ、認証済みの場合は同意画面へリダイレクトする
         */
        const session = getCookie(c, 'session')
        if (!session) {
            return c.redirect(`/login?redirect=/consent/${dynamicPath}`)
        }
        return c.redirect(`/consent/${dynamicPath}`)
    });
}