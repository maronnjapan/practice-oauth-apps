import { Hono } from 'hono'
import { prismaMiddleware } from './middlewares/setup-prisma.middleware'

export type Bindings = {
  DB: D1Database
  MY_KV_NAMESPACE: KVNamespace
}
const app = new Hono<{ Bindings: Bindings }>()

app.use('*', prismaMiddleware)

app.get('/', async (c) => {
  const prisma = c.get('prisma')
  const users = await prisma.user.findMany()
  return c.json(users)
})

export default app
