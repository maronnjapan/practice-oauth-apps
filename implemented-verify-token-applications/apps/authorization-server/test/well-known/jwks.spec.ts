import { fetchTestApplication } from "../utils"

describe('/.well-known/jwks.json', () => {
    // ケース1：keys配列を持つJSONが返ること
    it('keys配列を持つJSONが返ること', async () => {
        const res = await fetchTestApplication('/.well-known/jwks.json')

        expect(res.status).toEqual(200)
        expect(res.headers.get('content-type')).toContain('application/json')
        const jwks = await res.json() as { keys: unknown[] }
        expect(Array.isArray(jwks.keys)).toBe(true)
        expect(jwks.keys.length).toBeGreaterThan(0)
    })
    // ケース2：鍵オブジェクトの中身
    it('RS256の公開鍵として必要なフィールドが含まれること', async () => {
        const res = await fetchTestApplication('/.well-known/jwks.json')
        const jwks = await res.json() as { keys: Record<string, unknown>[] }
        const key = jwks.keys[0]

        expect(key.kty).toEqual('RSA')
        expect(key.n).toEqual(expect.any(String))
        expect(key.e).toEqual('AQAB')
        expect(key.kid).toEqual('1')
        expect(key.use).toEqual('sig')
        expect(key.alg).toEqual('RS256')
        // 秘密鍵の成分が含まれていないこと
        expect(key.d).toBeUndefined()
    })
})
