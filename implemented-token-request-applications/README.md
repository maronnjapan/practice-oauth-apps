# implemented-token-request-applications

書籍の**第8章を終えた時点**のスナップショットです。

- 認可サーバー：`/token` を追加。`client_secret_post` によるクライアント認証、認可コードの検証と使い捨て、RS256署名・`typ: at+jwt`（RFC 9068）のJWT発行、`Cache-Control: no-store`
- クライアント：`/callback` で受け取った認可コードをバックチャネルでトークンに交換

```bash
pnpm install
cd apps/authorization-server
pnpm db:setup:local   # テスト・起動の前に必須
pnpm test
```

署名鍵は `.env.example` に開発用のRS256鍵（JWK形式）を記載済みで、`db:setup:local` がそのまま `.env` にコピーします。
鍵を作り直す場合は `pnpm generate-keys` を実行してください。
セットアップ手順・ポート構成は[リポジトリのREADME](../README.md)を参照してください。
