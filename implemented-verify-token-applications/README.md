# implemented-verify-token-applications

書籍の**第10章を終えた時点**のスナップショット（本書のフローの完成形）です。

- 認可サーバー：公開鍵を配布する JWKS エンドポイント（`/.well-known/jwks.json`）を追加
- クライアント：取得したトークンをKVに保存し、`/fetch-resource` からBearerトークン付きでリソースサーバーへアクセス
- リソースサーバー：`/api/resource` でJWTの署名・有効期限・スコープ（`read:resource`）を検証

```bash
pnpm install
cd apps/authorization-server
pnpm db:setup:local   # テスト・起動の前に必須
pnpm test
```

3つのアプリをすべて起動すると、フロー全体（認可リクエスト→同意→トークン取得→リソースアクセス）をブラウザで通せます。
セットアップ手順・ポート構成・書籍本文との差分は[リポジトリのREADME](../README.md)を参照してください。
