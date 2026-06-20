# implemented-start-authorization-code-request-applications

書籍の**第4〜7章を終えた時点**のスナップショットです。

- 認可サーバー：`/authorize`（認可リクエストの検証・セッション確認）、`/login`（ユーザー認証・署名付きセッションCookie）、`/consent`（CSRFトークン付き同意画面・認可コードの発行・拒否時の `access_denied`）
- クライアント：`/start-authorize`（フロー開始）と `/callback`（認可コードの受け取り・表示）

```bash
pnpm install
cd apps/authorization-server
pnpm db:setup:local   # テスト・起動の前に必須
pnpm test
```

ログインのデモ資格情報はユーザー名 `testuser`・パスワード `password` です（第5章参照）。
セットアップ手順・ポート構成は[リポジトリのREADME](../README.md)を参照してください。
