import { Hono } from 'hono'
import { renderer } from './renderer'

export type Bindings = {
  MY_KV_NAMESPACE: KVNamespace
}
const app = new Hono<{ Bindings: Bindings }>()

app.use(renderer)

app.get('/', async (c) => {
  await c.env.MY_KV_NAMESPACE.put('key', 'value')
  const value = await c.env.MY_KV_NAMESPACE.get('key')
  return c.render(<h1>{value}</h1>)
})

export default app
