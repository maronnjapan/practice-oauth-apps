export const Consent = ({ scope, clientId, id, csrfToken }: { scope: string, clientId: string, id: string, csrfToken: string }) => {
    const scopes = scope.split(' ')
    return (
        <div style={{ marginTop: '64px' }}>
            <h1>同意の確認</h1>
            <p>{clientId} が、以下のスコープへのアクセスを求めています。</p>
            <ul>
                {scopes.map(s => (
                    <li key={s}>{s}</li>
                ))}
            </ul>
            <form method="post" action={`/consent/${id}`}>
                <input type="hidden" name="csrf_token" value={csrfToken} />
                <button type="submit" name="consent" value="yes">同意する</button>
                <button type="submit" name="consent" value="no">拒否する</button>
            </form>
        </div>
    )
}
