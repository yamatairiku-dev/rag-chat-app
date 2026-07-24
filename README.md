# 社内 RAG 検索チャットボット

社内規則や業務マニュアルを RAG（Retrieval-Augmented Generation）で検索できる業務支援チャットボットです。Microsoft Entra ID 認証と Dify API を利用し、React Router で構築しています。

## 機能

- 🚀 サーバーサイドレンダリング（SSR）
- ⚡️ Hot Module Replacement（HMR）
- 📦 アセットのバンドルと最適化
- 🔄 データ読み込みとミューテーション
- 🔒 TypeScript 標準対応
- 🎉 Tailwind CSS によるスタイリング
- 🔐 Microsoft Entra ID による認証
- 💬 Dify API 連携によるストリーミングチャット
- 📖 [React Router ドキュメント](https://reactrouter.com/)

## はじめに

### インストール

依存関係をインストールします。

```bash
npm install
```

### 環境変数の設定

起動前に `.env` を用意してください。テンプレートからコピーして値を埋めます。

```bash
# 開発環境
cp .env.development.example .env

# 本番環境
cp .env.example .env
```

#### 必須（これがないと起動できません）

| 変数名 | 説明 | 設定例 |
|--------|------|--------|
| `NODE_ENV` | 実行環境 | `development` / `production` |
| `PORT` | 待ち受けポート | 開発: `3000` / 本番: `8080` |
| `ENTRA_CLIENT_ID` | Entra ID のクライアント ID（UUID） | Azure Portal のアプリ登録から取得 |
| `ENTRA_CLIENT_SECRET` | Entra ID のクライアントシークレット | 同上 |
| `ENTRA_TENANT_ID` | Azure テナント ID（UUID） | 同上 |
| `ENTRA_REDIRECT_URI` | 認証後のリダイレクト URI | 開発: `http://localhost:3000/auth` |
| `ENTRA_POST_LOGOUT_REDIRECT_URI` | ログアウト後のリダイレクト URI | 開発: `http://localhost:3000` |
| `DIFY_API_URL` | Dify API のベース URL（`/v1` を含む） | `http://localhost:8000/v1` |
| `DIFY_API_KEY` | Dify API キー（`app-` で始まる） | Dify 管理画面から取得 |
| `SESSION_SECRET` | セッション暗号化キー（**32文字以上**） | 下記コマンドで生成 |

`SESSION_SECRET` の生成例:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### よく使う任意設定

| 変数名 | デフォルト | 説明 |
|--------|-----------|------|
| `APP_TITLE` | `Difyフロントエンドアプリ` | ヘッダーに表示するアプリ名 |
| `ENTRA_AUTHORITY` | `https://login.microsoftonline.com` | 認証エンドポイント |
| `GRAPH_DEPARTMENT_GROUP_PREFIX` | `^ZA[A-Za-z]\d{3}-[A-Za-z]` | 部署グループ名にマッチする正規表現 |
| `COOKIE_SECURE` | `true` | 開発では `false` を推奨 |
| `LOG_LEVEL` | `info` | `debug` / `info` / `warn` / `error` |

詳細（全変数・バリデーション・本番設定）は [docs/02_環境変数設定.md](./docs/02_環境変数設定.md) と [ガイド/環境変数セットアップガイド.md](./ガイド/環境変数セットアップガイド.md) を参照してください。

### 開発サーバーの起動

HMR 付きの開発サーバーを起動します。

```bash
npm run dev
```

アプリは `http://localhost:3000` で利用できます（`PORT` の設定に依存）。

## 本番ビルド

本番用ビルドを作成します。

```bash
npm run build
```

ビルド成果物は次の構成です。

```
├── package.json
├── package-lock.json
├── build/
│   ├── client/    # 静的アセット
│   └── server/    # サーバーサイドコード
```

起動する場合:

```bash
npm start
```

## デプロイ

### Docker デプロイ

Docker でビルドして実行する場合:

```bash
docker build -t my-app .

# コンテナを起動
docker run -p 3000:3000 my-app
```

Docker 対応の任意のプラットフォームにデプロイできます。例:

- AWS ECS
- Google Cloud Run
- Azure Container Apps
- Digital Ocean App Platform
- Fly.io
- Railway

### 手動デプロイ

Node アプリケーションのデプロイに慣れている場合は、組み込みのアプリサーバーをそのまま本番利用できます。

`npm run build` の出力をデプロイしてください。詳細は [docs/15_デプロイ手順書.md](./docs/15_デプロイ手順書.md) を参照してください。

## スタイリング

[Tailwind CSS](https://tailwindcss.com/) が初期設定済みです。好みの CSS フレームワークに差し替えることもできます。

## 関連ドキュメント

- [docs/README.md](./docs/README.md) — 仕様書一覧
- [ガイド/START_HERE.md](./ガイド/START_HERE.md) — はじめ方
- [AGENTS.md](./AGENTS.md) — 開発・テスト・コミットのガイドライン

---

React Router で構築されています。
