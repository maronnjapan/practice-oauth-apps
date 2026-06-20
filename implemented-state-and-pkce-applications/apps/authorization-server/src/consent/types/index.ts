export interface AuthorizationCodeValue {
    userId: string
    clientId: string
    redirectUri: string
    scope: string
    pkce?: {
        code_challenge: string
        code_challenge_method: 'S256'
    }
}
