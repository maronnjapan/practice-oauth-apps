import { Hono } from 'hono'
import { renderer } from './renderer'

export type Bindings = {
  MY_KV_NAMESPACE: KVNamespace
  CLIENT_ID: string
  CLIENT_SECRET: string
  REDIRECT_URI: string
  ISSUER_URI: string
}
const app = new Hono<{ Bindings: Bindings }>()

app.use(renderer)

// ホーム画面：認可フローを開始するリンクを表示する
app.get('/', async (c) => {
  return c.render(<a href='/start-authorize'>Authorization Code Flowの開始</a>)
})

// 認可フロー開始：認可サーバーのauthorizeエンドポイントへリダイレクトする
app.get('/start-authorize', async (c) => {
  const clientId = c.env.CLIENT_ID
  const redirectUri = c.env.REDIRECT_URI
  const issuerUri = c.env.ISSUER_URI
  return c.redirect(`${issuerUri}/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent('read:profile')}`)
})

app.get('/callback', async (c) => {
  const code = c.req.query('code')
  // codeが存在しない場合、認可サーバー側でフローが失敗しているのでエラー画面を表示
  if (!code) {
    return c.html(<div>認可コードが存在しません</div>, 400)
  }

  /**
   * トークンエンドポイントを呼び出し、認可コードをアクセストークンに交換する
   * クライアント認証はclient_secret_post方式（ボディにclient_idとclient_secretを含める）
   */
  const body = new URLSearchParams()
  body.set('grant_type', 'authorization_code')
  body.set('code', code)
  body.set('redirect_uri', c.env.REDIRECT_URI)
  body.set('client_id', c.env.CLIENT_ID)
  body.set('client_secret', c.env.CLIENT_SECRET)

  const tokenRes = await fetch(`${c.env.ISSUER_URI}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString()
  })
  if (!tokenRes.ok) {
    return c.html(<div>トークンエンドポイントの呼び出しに失敗しました</div>, 500)
  }
  const tokenJson = await tokenRes.json()
  return c.html(
    <div>
      <h1>アクセストークンを取得しました</h1>
      <pre>{JSON.stringify(tokenJson, null, 2)}</pre>
    </div>
  )
})

export default app
