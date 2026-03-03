# Dockerfile 改善案

実装前に検討したい指定・改善項目をまとめました。

---

## 1. Node のバージョン指定

### 現状
- Dockerfile: `node:20-alpine`
- ドキュメント（`01_技術スタック.md` 等）: **Node.js 24 LTS** / `node:24-alpine`

### 推奨
- **ドキュメントに合わせる場合**: `node:24-alpine` に統一する。
- **再現性を優先する場合**: メジャー・マイナーまで固定する。
  - Node 24 を使う例: `node:24.1.0-alpine`（または 24 の最新安定マイナー）
  - Node 20 を使う場合: `node:20.18.0-alpine`（LTS の特定マイナーで固定）

**提案**: ドキュメントと揃えるなら **`node:24-alpine`**（必要なら `node:24.1.0-alpine` のようにマイナー固定）にし、`01_技術スタック.md` の「ベースイメージ: node:24-alpine」と一致させる。

---

## 2. 公開ポートの明示（EXPOSE）

### 推奨
- アプリのデフォルトポート（`docs/02_環境変数設定.md` では 8080）を明示する。
- 例: `EXPOSE 8080`
- 効果: どのポートで待ち受けるかが Docker のメタデータとして分かり、オーケストレーターや運用者が参照しやすくなる。

---

## 3. 実行時環境のデフォルト（ENV）

### 推奨
- 本番コンテナのデフォルトを明示する。
  - `ENV NODE_ENV=production`
  - `ENV PORT=8080`
- 効果: `docker run` で `-e PORT=3000` を渡さない場合でも 8080 で待ち受け、ドキュメントと一致する。

---

## 4. 非 root ユーザーでの実行

### 推奨
- セキュリティのため、コンテナ内で **root 以外のユーザー** で Node を動かす。
- 手順の例:
  - `node` ユーザー（または `app`）を作成
  - `/app` 以下をそのユーザーが読めるように `chown`
  - `USER node`（または `USER app`) で切り替え
- 効果: コンテナ侵害時に影響を小さくできる。

---

## 5. 起動コマンド（CMD）

### 現状
- `CMD ["npm", "run", "start"]` → プロセスは `npm` → `node` の 2 段になる。

### 推奨（任意）
- **直接 node で起動** する方がプロセスが単純で、シグナル伝達も分かりやすい。
  - 例: `CMD ["node", "node_modules/react-router-serve/bin.js", "./build/server/index.js"]`
  - または `react-router-serve` のバイナルパスを確認して `node` で直接指定。
- 効果: プロセスツリーの簡素化、メモリ・シグナル扱いの明確化。必須ではないが推奨。

---

## 6. イメージのメタデータ（LABEL）

### 推奨
- OCI の慣例に合わせてラベルを付けると、運用・監査で便利。
- 例:
  - `org.opencontainers.image.source` … リポジトリ URL
  - `org.opencontainers.image.title` … イメージ名（例: rag-chat-app）
  - `org.opencontainers.image.description` … 短い説明
- 効果: どのソースからビルドしたか、何のイメージかが一目で分かる。

---

## 7. ヘルスチェック（HEALTHCHECK）※任意

### 推奨
- Kubernetes や ECS、Docker Compose などでヘルスチェックを使う場合に有効。
- 例: ルートや `/health` など、アプリが用意しているエンドポイントに `curl` や `wget` でアクセス。
  - `HEALTHCHECK --interval=30s --timeout=3s --start-period=5s CMD wget -q -O - http://localhost:${PORT:-8080}/ || exit 1`
- 注意: アプリにヘルス用パスが無い場合は、ルート `GET /` で 200 が返るかで判定するか、ヘルス用ルートを追加してから指定する。
- 効果: オーケストレーターが「起動済みで応答するか」を自動判定できる。

---

## 8. npm ci のオプション（任意）

### 現状
- `npm ci` / `npm ci --omit=dev`

### 検討
- **`--omit=optional`**: 本番ステージでオプショナル依存を入れないようにするとイメージが少し小さくなる可能性がある。プロジェクトが optional に依存していなければ検討の余地あり。
- **`--ignore-scripts`**: インストール時の `postinstall` 等を実行しないため、ネイティブモジュールなどで問題が出る可能性がある。このプロジェクトで必要なスクリプトが無いか確認してから検討。

---

## 9. ドキュメントとの整合

- Dockerfile で **Node 24** を採用する場合: `docs/01_技術スタック.md` の「ベースイメージ: node:24-alpine」はそのままでよい。
- **Node 20** のままにする場合: 上記ドキュメントを「node:20-alpine」に修正し、「Node.js 24 LTS」などの記述も 20 LTS に合わせて更新する必要がある。

---

## まとめ（優先度の目安）

| 項目 | 優先度 | 内容 |
|------|--------|------|
| Node バージョン | 高 | ドキュメントと統一（24-alpine）または 20 でマイナー固定 |
| EXPOSE | 高 | `EXPOSE 8080` を追加 |
| ENV | 高 | `NODE_ENV=production`, `PORT=8080` をデフォルトで指定 |
| 非 root ユーザー | 高 | `USER node`（等）で実行 |
| CMD の直接 node 起動 | 中 | 任意。プロセス簡素化のため推奨 |
| LABEL | 中 | イメージの出所・用途が分かるように推奨 |
| HEALTHCHECK | 低 | オーケストレーターで使う場合に検討 |
| npm ci オプション | 低 | 必要に応じて `--omit=optional` 等を検討 |

この内容を前提に、Dockerfile の具体的な修正案（パッチ）に進めます。
