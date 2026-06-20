import { fetchTestApplication } from './utils'


describe('test', () => {
    it('sample test', async () => {
        const res = await fetchTestApplication('/')

        const text = await res.text()
        expect(text).toContain('<h1>Hello!</h1>')
    })
})