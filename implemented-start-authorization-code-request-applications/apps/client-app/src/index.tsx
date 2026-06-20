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

// コールバック処理：認可サーバーから返ってきた認可コードを受け取る
app.get('/callback', async (c) => {
  const code = c.req.query('code')
  // codeが存在しない場合、認可サーバー側でフローが失敗しているのでエラー画面を表示
  if (!code) {
    return c.html(<div>認可コードが存在しません</div>, 400)
  }
  return c.html(
    <div>
      <h1>認可コードを受け取りました</h1>
      <p>code: {code}</p>
    </div>
  )
})

export default app
