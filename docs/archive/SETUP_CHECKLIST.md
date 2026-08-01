# E2Eテスト実行環境 セットアップチェックリスト

**作成日**: 2025年1月

---

## ✅ 設定が必要な項目（優先順位順）

### 🔴 優先度: 高（必須）

#### 1. Playwrightブラウザのインストール

**コマンド**:
```bash
npx playwright install chromium
```

**確認方法**:
```bash
# ブラウザがインストールされているか確認
ls -la node_modules/.cache/playwright/browsers/
```

**所要時間**: 約1-2分

---

#### 2. 環境変数の設定確認

**確認コマンド**:
```bash
# .envファイルが存在するか確認
test -f .env && echo "✅ .envファイルが存在します" || echo "❌ .envファイルが見つかりません"

# 必要な環境変数が設定されているか確認
grep -q "ENTRA_CLIENT_ID" .env && echo "✅ ENTRA_CLIENT_ID設定済み" || echo "❌ ENTRA_CLIENT_ID未設定"
grep -q "ENTRA_TENANT_ID" .env && echo "✅ ENTRA_TENANT_ID設定済み" || echo "❌ ENTRA_TENANT_ID未設定"
grep -q "DIFY_API_URL" .env && echo "✅ DIFY_API_URL設定済み" || echo "❌ DIFY_API_URL未設定"
grep -q "SESSION_SECRET" .env && echo "✅ SESSION_SECRET設定済み" || echo "❌ SESSION_SECRET未設定"
```

**設定が必要な環境変数**:
- `ENTRA_CLIENT_ID` - Microsoft Entra IDのクライアントID
- `ENTRA_TENANT_ID` - Microsoft Entra IDのテナントID
- `ENTRA_CLIENT_SECRET` - Microsoft Entra IDのクライアントシークレット
- `ENTRA_REDIRECT_URI` - リダイレクトURI（例: `http://localhost:3000/auth`）
- `DIFY_API_URL` - Dify APIのURL
- `DIFY_API_KEY` - Dify APIのキー
- `SESSION_SECRET` - セッションシークレット（32文字以上）

**参考**: `docs/02_環境変数設定.md`

---

### 🟡 優先度: 中（推奨）

#### 3. 開発サーバーの起動確認

**コマンド**:
```bash
npm run dev
```

**確認ポイント**:
- サーバーが正常に起動する
- エラーが表示されない
- `http://localhost:3000`でアクセスできる

**問題がある場合**:
- 環境変数を確認
- ポート3000が使用可能か確認（`lsof -i :3000`）
- 依存関係を再インストール（`npm install`）

---

#### 4. ポート設定の確認

**デフォルト**: `http://localhost:3000`

**別のポートを使用する場合**:
```bash
# 環境変数で設定
export PORT=3001
export PLAYWRIGHT_BASE_URL=http://localhost:3001
npm run test:e2e
```

---

### 🟢 優先度: 低（オプション）

#### 5. テスト用認証モックの設定

実際のMicrosoft Entra ID認証を使わずにテストを実行する場合。

**詳細**: `E2E_SETUP.md`の「テスト用の認証モック設定」セクションを参照

---

## 🚀 クイックセットアップ

以下のコマンドを順番に実行してください：

```bash
# 1. Playwrightブラウザをインストール
npx playwright install chromium

# 2. 環境変数を確認（.envファイルが存在し、必要な変数が設定されているか）
cat .env | grep -E "ENTRA_|DIFY_|SESSION_"

# 3. 開発サーバーが起動するか確認（別ターミナルで実行）
# npm run dev

# 4. E2Eテストを実行
npm run test:e2e:ui
```

---

## 📋 設定確認チェックリスト

実行前に以下を確認してください：

- [ ] Playwrightブラウザがインストールされている
  ```bash
  npx playwright install chromium
  ```

- [ ] `.env`ファイルが存在する
  ```bash
  test -f .env
  ```

- [ ] 必要な環境変数が設定されている
  - `ENTRA_CLIENT_ID`
  - `ENTRA_TENANT_ID`
  - `ENTRA_CLIENT_SECRET`
  - `ENTRA_REDIRECT_URI`
  - `DIFY_API_URL`
  - `DIFY_API_KEY`
  - `SESSION_SECRET`

- [ ] 開発サーバーが起動できる
  ```bash
  npm run dev
  ```

- [ ] E2Eテストが実行できる
  ```bash
  npm run test:e2e
  ```

---

## 🔍 トラブルシューティング

### 問題: ブラウザがインストールされていない

**エラー**:
```
Error: Executable doesn't exist
```

**解決**:
```bash
npx playwright install chromium
```

---

### 問題: 環境変数が設定されていない

**エラー**:
```
環境変数が設定されていません
```

**解決**:
1. `.env.example`をコピーして`.env`を作成
2. 必要な環境変数を設定
3. `docs/02_環境変数設定.md`を参照

---

### 問題: 開発サーバーが起動しない

**エラー**:
```
[WebServer] Error: ...
```

**解決**:
1. 環境変数を確認
2. ポートが使用可能か確認
3. 依存関係を再インストール

---

## 📚 関連ドキュメント

- [E2Eテスト設定ガイド](./E2E_SETUP.md) - 詳細な設定手順
- [環境変数設定ガイド](./docs/02_環境変数設定.md) - 環境変数の詳細
- [テスト実装状況](./TEST_STATUS.md) - テストの実装状況

---

**最終更新**: 2025年1月





