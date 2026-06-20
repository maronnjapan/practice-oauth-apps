import { Hono } from 'hono'
import { prismaMiddleware } from './middlewares/setup-prisma.middleware'
import { setUpAuthorizeRoute } from './authorize/router'
import { setUpLoginRoute } from './login/router'
import { setUpConsentRoute } from './consent/router'
import { setUpTokenRoute } from './token/router'
import { setUpWellKnownRoutes } from './.well-known/router'

export type Bindings = {
  DB: D1Database
  MY_KV_NAMESPACE: KVNamespace
  PRIVATE_KEY: string
  PUBLIC_KEY: string
  ISSUER: string
  RESOURCE_SERVER_IDENTIFIER: string
}
const app = new Hono<{ Bindings: Bindings }>()

app.use('*', prismaMiddleware)

setUpAuthorizeRoute(app)
setUpLoginRoute(app)
setUpConsentRoute(app)
setUpTokenRoute(app)
setUpWellKnownRoutes(app)

export default app
