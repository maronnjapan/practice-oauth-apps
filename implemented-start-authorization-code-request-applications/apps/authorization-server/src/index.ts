import { Hono } from 'hono'
import { prismaMiddleware } from './middlewares/setup-prisma.middleware'
import { setUpAuthorizeRoute } from './authorize/router'
import { setUpLoginRoute } from './login/router'
import { setUpConsentRoute } from './consent/router'

export type Bindings = {
  DB: D1Database
  MY_KV_NAMESPACE: KVNamespace
}
const app = new Hono<{ Bindings: Bindings }>()

app.use('*', prismaMiddleware)

setUpAuthorizeRoute(app)
setUpLoginRoute(app)
setUpConsentRoute(app)

export default app
