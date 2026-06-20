import app from "..";

export const setUpWellKnownRoutes = (baseApp: typeof app) => {
    baseApp.get('/.well-known/jwks.json', async (c) => {
        // 環境変数から公開鍵（JWK形式）を取得する
        const publicKey = JSON.parse(c.env.PUBLIC_KEY)
        return c.json({
            keys: [
                {
                    kty: publicKey.kty,
                    n: publicKey.n,
                    e: publicKey.e,
                    kid: '1', // 第8章のJWTヘッダーのkidと同じ値
                    use: 'sig',
                    alg: 'RS256'
                }
            ]
        })
    })
}
