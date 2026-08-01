# E2Eテスト実行環境の設定ガイド

**作成日**: 2025年1月

---

## 📋 設定が必要な項目

E2Eテストを実行するために、以下の設定が必要です：

### 1. Playwrightブラウザのインストール ✅ **必須**

Playwrightのブラウザ（Chromium、Firefox、WebKit）をインストールする必要があります。

```bash
# ブラウザをインストール
npx playwright install

# または、Chromiumのみインストール（軽量）
npx playwright install chromium
```

**確認方法**:
```bash
npx playwright --version
# ブラウザがインストールされている場合、バージョン情報が表示されます
```

---

### 2. 環境変数の設定 ✅ **必須**

E2Eテストを実行するには、開発サーバーが起動する必要があります。
そのため、`.env`ファイルに必要な環境変数が設定されている必要があります。

**必要な環境変数**:
- `ENTRA_CLIENT_ID` - Microsoft Entra IDのクライアントID
- `ENTRA_TENANT_ID` - Microsoft Entra IDのテナントID
- `ENTRA_CLIENT_SECRET` - Microsoft Entra IDのクライアントシークレット
- `ENTRA_REDIRECT_URI` - リダイレクトURI（例: `http://localhost:3000/auth`）
- `DIFY_API_URL` - Dify APIのURL
- `DIFY_API_KEY` - Dify APIのキー
- `SESSION_SECRET` - セッションシークレット（32文字以上）

**確認方法**:
```bash
# .envファイルが存在し、必要な環境変数が設定されているか確認
cat .env | grep -E "ENTRA_|DIFY_|SESSION_"
```

---

### 3. 開発サーバーのポート設定 ✅ **推奨**

`playwright.config.ts`では、デフォルトで`http://localhost:3000`を使用します。
開発サーバーが別のポートで起動する場合は、環境変数で設定できます。

```bash
# 環境変数でポートを指定
export PLAYWRIGHT_BASE_URL=http://localhost:5173
npm run test:e2e
```

または、`.env`ファイルに追加：
```
PORT=3000
PLAYWRIGHT_BASE_URL=http://localhost:3000
```

---

### 4. テスト用の認証モック設定 ⚠️ **オプション（推奨）**

実際のMicrosoft Entra ID認証を使わずにテストを実行する場合、
認証をモックする設定が必要です。

#### オプションA: テスト用の認証ヘルパーを作成

`tests/e2e/helpers/auth.ts`を作成：

```typescript
import { Page } from '@playwright/test';

/**
 * テスト用の認証済みセッションを設定
 */
export async function setupAuthenticatedSession(page: Page, context: any) {
  // テスト用のセッションCookieを設定
  await context.addCookies([
    {
      name: 'session',
      value: 'test-session-id.signed-signature',
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
    },
  ]);
}
```

#### オプションB: テスト環境用の認証エンドポイントを作成

開発環境でのみ有効なテスト用認証エンドポイントを作成し、
E2Eテストで使用する。

---

## 🚀 セットアップ手順

### ステップ1: Playwrightブラウザのインストール

```bash
# プロジェクトルートで実行
npx playwright install chromium
```

**所要時間**: 約1-2分（初回のみ）

---

### ステップ2: 環境変数の確認

```bash
# .envファイルが存在するか確認
ls -la .env

# 必要な環境変数が設定されているか確認
grep -E "ENTRA_CLIENT_ID|ENTRA_TENANT_ID|DIFY_API_URL|SESSION_SECRET" .env
```

**設定されていない場合**:
1. `.env.example`をコピーして`.env`を作成
2. 必要な環境変数を設定
3. `docs/02_環境変数設定.md`を参照

---

### ステップ3: 開発サーバーの起動確認

```bash
# 開発サーバーが起動できるか確認
npm run dev
```

**確認ポイント**:
- サーバーが正常に起動する
- エラーが表示されない
- ポート3000（または設定したポート）でアクセスできる

---

### ステップ4: E2Eテストの実行

```bash
# E2Eテストを実行
npm run test:e2e

# UIモードで実行（推奨）
npm run test:e2e:ui
```

**初回実行時**:
- Playwrightが自動的に開発サーバーを起動します
- ブラウザが起動してテストが実行されます

---

## 🔍 トラブルシューティング

### 問題1: ブラウザがインストールされていない

**エラーメッセージ**:
```
Error: Executable doesn't exist
```

**解決方法**:
```bash
npx playwright install chromium
```

---

### 問題2: 開発サーバーが起動しない

**エラーメッセージ**:
```
[WebServer] Error: ...
```

**確認事項**:
1. 環境変数が正しく設定されているか
2. ポート3000が使用可能か
3. 依存関係がインストールされているか（`npm install`）

**解決方法**:
```bash
# 依存関係を再インストール
npm install

# ポートを確認
lsof -i :3000

# 別のポートを使用
PORT=3001 npm run dev
```

---

### 問題3: 認証エラーが発生する

**エラーメッセージ**:
```
認証エラー: ...
```

**解決方法**:
1. テスト用の認証モックを使用する（推奨）
2. または、実際のEntra ID認証情報を設定する
3. Azure Portalでアプリ登録が完了しているか確認

---

### 問題4: タイムアウトエラー

**エラーメッセージ**:
```
Timeout waiting for ...
```

**解決方法**:
1. `playwright.config.ts`の`timeout`を増やす
2. 開発サーバーの起動時間を確認
3. ネットワーク接続を確認

---

## 📝 推奨設定

### 開発環境での推奨設定

1. **ブラウザ**: Chromiumのみインストール（軽量）
2. **ポート**: 3000（デフォルト）
3. **認証**: テスト用モックを使用
4. **実行モード**: UIモード（`npm run test:e2e:ui`）

### CI/CD環境での推奨設定

1. **ブラウザ**: 全てインストール（`npx playwright install`）
2. **ポート**: 環境変数で指定
3. **認証**: テスト用の認証情報を使用
4. **実行モード**: ヘッドレスモード（デフォルト）

---

## ✅ 設定確認チェックリスト

- [ ] Playwrightブラウザがインストールされている
- [ ] `.env`ファイルが存在し、必要な環境変数が設定されている
- [ ] 開発サーバーが正常に起動する
- [ ] `npm run test:e2e`が実行できる
- [ ] テストが正常に実行される（または、期待されるエラーが表示される）

---

## 🎯 次のステップ

設定が完了したら：

1. **E2Eテストの実行**
   ```bash
   npm run test:e2e:ui
   ```

2. **テスト結果の確認**
   - テストが正常に実行されるか確認
   - 失敗したテストがあれば、原因を調査

3. **テストの改善**
   - 認証モックの実装
   - テストケースの追加
   - エラーハンドリングの改善

---

**関連ドキュメント**:
- [Playwright公式ドキュメント](https://playwright.dev/)
- [環境変数設定ガイド](./docs/02_環境変数設定.md)
- [テスト実装状況](./TEST_STATUS.md)

---

**最終更新**: 2025年1月





