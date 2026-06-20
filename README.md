# OAuth 2.0 Authorization Code Flow 実装サンプル

OAuth 2.0 の Authorization Code Flow を実装しながら学ぶ書籍のサンプルコードリポジトリです。
書籍の各章で実装するコードの「出発点」と「各章を終えた時点の到達点」を、ディレクトリ単位のスナップショットとして収録しています。

## 必要な環境

- Node.js 22 以上
- pnpm 10（各ワークスペースの `packageManager` は `pnpm@10.17.0` を指定）

## アプリケーション構成

各スナップショットは pnpm のモノレポ構成で、第1章で説明するフローの登場人物ごとに3つのアプリが入っています。

| アプリ | フロー上の役割 | ローカルのポート |
|---|---|---|
| `apps/authorization-server` | 認可サーバー（`/authorize`・`/consent`・`/token`・JWKS） | `8787` |
| `apps/client-app` | クライアント（フロー開始・コールバック・リソース取得） | `8788` |
| `apps/resource-server` | リソースサーバー（アクセストークンの検証） | `8789` |

ポートは「認可サーバー 8787 → クライアント 8788 → リソースサーバー 8789」で固定しています。
シードデータのリダイレクトURI（`http://localhost:8788/callback`）はこのポート構成を前提にしています。

## ディレクトリと書籍の章の対応

| ディレクトリ | 位置づけ | 対応する章 |
|---|---|---|
| `initialized-applications` | 設定済みの出発点。「サクッと派」はここから始める | 第2・3章を終えた時点 |
| `practice-applications` | 一から自分で設定・実装するための作業用。「じっくり派」はここを使う | 第2章の開始時点 |
| `implemented-start-authorization-code-request-applications` | 認可リクエストの受付〜クライアント実装まで | 第4〜7章を終えた時点 |
| `implemented-token-request-applications` | トークンエンドポイントの実装まで | 第8章を終えた時点 |
| `implemented-state-and-pkce-applications` | state・PKCEの導入まで | 第9章を終えた時点 |
| `implemented-verify-token-applications` | トークン検証・リソースアクセスまで（完成形） | 第10章を終えた時点 |

実装に詰まったときは、読んでいる章に対応するディレクトリを開けば到達点のコードを確認できます。

## セットアップ

各スナップショットは独立したワークスペースです。使いたいディレクトリに移動してインストールしてください。

```bash
cd initialized-applications   # 使いたいスナップショットに読み替える
pnpm install
```

次に、認可サーバーのデータベースを準備します。

```bash
cd apps/authorization-server
pnpm db:setup:local
```

`db:setup:local` は次の3ステップをまとめて実行します（第2章で解説しています）。

1. `.env.example` をコピーして `.env` を作る（接続先データベースの指定）
2. `db:apply:local`：Prismaのスキーマ反映とD1へのマイグレーション適用
3. `db:seed:local`：動作確認用のシードデータ投入

> [!IMPORTANT]
> 認可サーバーのテスト実行・起動には `src/generated/prisma`（Prismaクライアント）が必要で、これは `db:setup:local` の中で生成されます。
> クローン直後にテストを実行すると `Failed to load url ../generated/prisma` というエラーになるので、必ず先に `db:setup:local` を実行してください。

クライアントアプリは初回の `pnpm dev` 実行時に `.env.example` から `.env` が自動生成されるため、追加の作業は不要です。

## 起動と動作確認

ターミナルを分けて各アプリを起動します。

```bash
# ターミナル1：認可サーバー（http://localhost:8787）
cd apps/authorization-server && pnpm dev

# ターミナル2：クライアント（http://localhost:8788）
cd apps/client-app && pnpm dev

# ターミナル3：リソースサーバー（http://localhost:8789）※第10章のスナップショットで使用
cd apps/resource-server && pnpm dev
```

`http://localhost:8788/` を開き、「Authorization Code Flowの開始」リンクからフローを開始できます
（`implemented-start-authorization-code-request-applications` 以降のスナップショット）。

## テストの実行

各アプリのディレクトリで実行します。

```bash
pnpm test
```

- `authorization-server`：事前に `db:setup:local` の実行が必要です（上記の注意を参照）
- `client-app`：トークンエンドポイントなど外部への通信は `fetchMock` でモックしているため、他のアプリを起動していなくても実行できます
- `resource-server`：JWKSの取得をモックし、テスト内で生成した鍵で署名したJWTを使って検証しています

テスト用のストレージ（D1・KV）はテストごとに隔離・リセットされるため、`pnpm dev` で使うローカルデータには影響しません（第3章で解説しています）。

## シードデータ

`db:seed:local` で投入される値は、書籍の動作確認でそのまま使います。

| 値 | 何を表すか | 主に登場する章 |
|---|---|---|
| `test@example.com` / `password123` | 認可サーバーに登録されたユーザー | 第2章・第5章 |
| `cli_seed_1` / `secret_12345` | 登録済みクライアントの `client_id` / `client_secret` | 第4章・第8章 |
| `http://localhost:8788/callback` | クライアントの登録済みリダイレクトURI | 第4章・第7章 |
| `read:profile` | クライアントが要求できるスコープ。保護リソース（`/api/profile`）へのアクセスにも必要 | 第4章・第6章・第10章 |

## 書籍本文とサンプルコードの関係

各スナップショットの実装・テストコードは、書籍本文で提示しているコードと一致するように管理しています。
ログイン（第5章：デモ資格情報 `testuser` / `password`）、同意画面のCSRFトークンと拒否時の `access_denied`（第6章）、RS256・`typ: at+jwt`・`client_secret_post` のトークンエンドポイント（第8章）、state・PKCE（第9章）、JWKSと `client_session` / `/resource` 構成（第10章）まで、本文どおりに実装されています。

環境変数ファイルも本文と同じく `.env`（`.env.example` をコピーして作る）を使います。署名鍵について補足すると、サンプルでは `.env.example` に開発用の鍵をあらかじめ記載しているため、`db:setup:local` で `.env` を生成するだけで動作確認を始められます。鍵を作り直したい場合は `pnpm generate-keys`（`implemented-token-request-applications` 以降）で `.env` の鍵を再生成できます。

保護されたAPI（`/api/profile`）は、本文10-1の構成どおり認可サーバーとは独立したWorker（`apps/resource-server`）に実装しています。`implemented-verify-token-applications` では `apps/resource-server` を起動して使います。

## 注意事項

このリポジトリは学習用です。
シードデータのパスワードや `client_secret` は平文で格納しており、そのまま本番環境で使うことはできません。
本番にデプロイする場合は、`wrangler.jsonc` の `database_id` や KV の `id` を実際のリソースのIDに変更し、秘密情報は `wrangler secret put` で登録してください。
