# implemented-state-and-pkce-applications

書籍の**第9章を終えた時点**のスナップショットです。

- クライアント：`/start-authorize` で `state` と PKCE（`code_challenge` / `code_challenge_method=S256`）を付与し、`/callback` で `state` を検証
- 認可サーバー：認可コードに `code_challenge` を紐づけて保存し、`/token` で `code_verifier` を検証

```bash
pnpm install
cd apps/authorization-server
pnpm db:setup:local   # テスト・起動の前に必須
pnpm test
```

セットアップ手順・ポート構成・書籍本文との差分は[リポジトリのREADME](../README.md)を参照してください。
