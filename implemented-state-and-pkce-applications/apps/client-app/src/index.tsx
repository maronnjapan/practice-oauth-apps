import { Hono } from 'hono'
import { renderer } from './renderer'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'

export type Bindings = {
  MY_KV_NAMESPACE: KVNamespace
  CLIENT_ID: string
  CLIENT_SECRET: string
  REDIRECT_URI: string
  ISSUER_URI: string
}
const app = new Hono<{ Bindings: Bindings }>()

app.use(renderer)

app.get('/', async (c) => {
  return c.render(<a href='/start-authorize'>Authorization Code Flowの開始</a>)
})

app.get('/start-authorize', async (c) => {
  const clientId = c.env.CLIENT_ID
  const redirectUri = c.env.REDIRECT_URI
  const issuerUri = c.env.ISSUER_URI

  // stateを生成し、コールバックで照合できるようCookieに保存する
  const state = crypto.randomUUID().replaceAll('-', '')
  setCookie(c, 'oauth_state', state, {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    maxAge: 600, // 10分
    path: '/'
  })

  // 64文字（43文字以上128文字以下）のランダムな16進数文字列としてcode_verifierを生成する
  const codeVerifier = [...crypto.getRandomValues(new Uint8Array(32))].map(b => b.toString(16).padStart(2, '0')).join('');
  // stateと同様、トークンリクエスト時に取り出せるようCookieに保存する
  setCookie(c, 'code_verifier', codeVerifier, {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    maxAge: 600, // 10分
    path: '/'
  })

  // code_verifierをSHA-256でハッシュ後、Base64URL形式にエンコードしてcode_challengeを作る
  const codeChallenge = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(codeVerifier))
  const base64CodeChallenge = btoa(String.fromCharCode(...new Uint8Array(codeChallenge)))
    .replaceAll('=', '').replaceAll('+', '-').replaceAll('/', '_')

  // state・code_challenge・code_challenge_methodをクエリに付与する
  return c.redirect(`${issuerUri}/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent('read:profile')}&state=${state}&code_challenge=${base64CodeChallenge}&code_challenge_method=S256`)
})

app.get('/callback', async (c) => {
  const code = c.req.query('code')
  if (!code) {
    return c.html(<div>認可コードが存在しません</div>, 400)
  }

  // クエリのstateとCookieのstateを照合する
  const state = c.req.query('state')
  const cookieState = getCookie(c, 'oauth_state')
  if (!state || !cookieState || state !== cookieState) {
    return c.html(<div>stateの検証に失敗しました</div>, 400)
  }
  // 使用済みのstateを削除する
  deleteCookie(c, 'oauth_state')

  // Cookieからcode_verifierを取り出し、使用済みのCookieを削除する
  const codeVerifier = getCookie(c, 'code_verifier')
  if (codeVerifier) {
    deleteCookie(c, 'code_verifier')
  }

  const body = new URLSearchParams()
  body.set('grant_type', 'authorization_code')
  body.set('code', code)
  body.set('redirect_uri', c.env.REDIRECT_URI)
  body.set('client_id', c.env.CLIENT_ID)
  body.set('client_secret', c.env.CLIENT_SECRET)
  // code_verifierをトークンリクエストに含める
  if (codeVerifier) {
    body.set('code_verifier', codeVerifier)
  }

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
