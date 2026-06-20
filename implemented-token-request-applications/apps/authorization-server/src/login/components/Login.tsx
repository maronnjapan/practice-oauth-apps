export const Login = ({ redirect, errorMessage }: { redirect: string, errorMessage?: string }) => {
    return (
        <div style={{ marginTop: '64px' }}>
            <h1>ログイン</h1>
            {errorMessage && <p>{errorMessage}</p>}
            <form method="post" action="/login">
                <div>
                    <label>
                        ユーザー名
                        <input type="text" name="username" />
                    </label>
                </div>
                <div>
                    <label>
                        パスワード
                        <input type="password" name="password" />
                    </label>
                </div>
                <input type="hidden" name="redirect" value={redirect} />
                <button type="submit">ログイン</button>
            </form>
        </div>
    )
}
