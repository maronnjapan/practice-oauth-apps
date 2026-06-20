# initialized-applications

書籍の**第2・3章を終えた時点**のスナップショットです。
データベース（Cloudflare D1 + Prisma）・シードデータ・Workers KV・テスト基盤の設定が済んだ「出発点」で、第4章以降の実装はここから始めます。

「サクッと派」（セットアップをスクリプトで済ませたい方）はこのディレクトリを使ってください。

```bash
pnpm install
cd apps/authorization-server
pnpm db:setup:local
pnpm test
```

セットアップ手順・ポート構成・シードデータの詳細は[リポジトリのREADME](../README.md)を参照してください。
