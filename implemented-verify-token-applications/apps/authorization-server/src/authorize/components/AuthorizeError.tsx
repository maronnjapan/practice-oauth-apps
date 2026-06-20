
export const AuthorizeError = ({ error, description }: { error: string, description?: string }) => {
    return (
        <div style={{ marginTop: '64px' }}>
            <h1>Authorize Error</h1>
            <p>{error}</p>
            {description && <p>{description}</p>}
        </div>
    )
}