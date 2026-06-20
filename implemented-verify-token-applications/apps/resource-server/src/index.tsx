import { Hono } from 'hono'
import { renderer } from './renderer'
import { setUpApiRoutes } from './api/router'

export type Bindings = {
  // 信頼する認可サーバーのissuer。JWKSの取得先かつissクレームの検証に使う
  AUTHORIZATION_SERVER_ISSUER: string
  // 自分（リソースサーバー）を表す識別子。audクレームの検証に使う
  RESOURCE_SERVER_IDENTIFIER: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.use(renderer)

app.get('/', (c) => {
  return c.render(<h1>Hello!</h1>)
})

setUpApiRoutes(app)

export default app
