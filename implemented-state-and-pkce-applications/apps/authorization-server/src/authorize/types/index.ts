export interface AuthorizeRequestValue {
    scope: string
    clientId: string
    redirectUri: string
    responseType: 'code'
    state?: string
    pkce?: {
        code_challenge: string
        code_challenge_method: 'S256'
    }
}
