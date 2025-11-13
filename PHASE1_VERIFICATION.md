# Phase 1 動作確認チェックリスト

**確認日**: 2025年1月  
**Phase**: Phase 1 - 認証基盤

---

## ✅ 実装完了項目

### 1. 型定義
- [x] `app/types/error.ts` - エラーコードとAppErrorクラス
- [x] `app/types/session.ts` - セッション型定義
- [x] `app/types/graph.ts` - Graph API型定義

### 2. 環境変数バリデーション
- [x] `app/lib/utils/env.ts` - Zodスキーマによるバリデーション

### 3. Entra IDクライアント
- [x] `app/lib/auth/entra-client.ts` - MSAL認証クライアント
  - [x] `getAuthorizationUrl()` - 認証URL生成
  - [x] `exchangeCodeForTokens()` - トークン交換
  - [x] `refreshAccessToken()` - トークンリフレッシュ

### 4. Graph APIクライアント
- [x] `app/lib/graph/graph-client.ts` - Graph APIクライアント作成
- [x] `app/lib/graph/user-service.ts` - ユーザー情報・所属部署取得
  - [x] `getUserInfo()` - ユーザー情報取得
  - [x] `getUserDepartment()` - 所属部署取得

### 5. セッション管理
- [x] `app/lib/session/memory-storage.ts` - メモリストレージ実装
- [x] `app/lib/session/session-manager.ts` - セッション管理機能
  - [x] `createSession()` - セッション作成
  - [x] `getSession()` - セッション取得
  - [x] `getSessionWithId()` - セッションID付き取得
  - [x] `deleteSession()` - セッション削除
  - [x] `updateSession()` - セッション更新
- [x] `app/lib/session/token-refresh.ts` - トークン自動更新
  - [x] `ensureValidToken()` - トークン有効性確認・更新

### 6. 認証ルート
- [x] `app/routes/auth.login.tsx` - ログインルート
- [x] `app/routes/auth.callback.tsx` - OAuthコールバックルート
- [x] `app/routes/auth.logout.tsx` - ログアウトルート
- [x] `app/routes/chat.tsx` - チャット画面（プレースホルダー）
- [x] `app/routes/home.tsx` - ホーム画面（リダイレクト）
- [x] `app/routes.ts` - ルート設定

---

## 🔍 動作確認手順

### 前提条件

1. **環境変数の確認**
   ```bash
   # .envファイルが存在し、以下の変数が設定されていることを確認
   - ENTRA_CLIENT_ID
   - ENTRA_CLIENT_SECRET
   - ENTRA_TENANT_ID
   - ENTRA_REDIRECT_URI (http://localhost:5173/auth/callback)
   - DIFY_API_URL
   - DIFY_API_KEY
   - SESSION_SECRET (32文字以上)
   ```

2. **Azure Portal設定の確認**
   - [ ] Entra IDアプリ登録が完了
   - [ ] リダイレクトURIが設定されている
     - 開発環境: `http://localhost:5173/auth/callback`
   - [ ] APIパーミッションが設定されている
     - `User.Read`
     - `GroupMember.Read.All`
   - [ ] 管理者の同意が付与されている
   - [ ] グループが作成されている（例: `DEPT_001_営業部`）
   - [ ] テストユーザーがグループに所属している

### 確認手順

#### 1. 開発サーバー起動

```bash
npm run dev
```

**期待結果**: 
- サーバーが `http://localhost:5173` で起動
- エラーなく起動する

#### 2. ホーム画面アクセス

ブラウザで `http://localhost:5173` にアクセス

**期待結果**:
- セッションがない場合、`/auth/login` にリダイレクトされる
- セッションがある場合、`/chat` にリダイレクトされる

#### 3. ログイン画面

`http://localhost:5173/auth/login` にアクセス

**期待結果**:
- Microsoft Entra IDの認証画面にリダイレクトされる
- エラーが発生しない

#### 4. 認証フロー

1. Microsoftアカウントでログイン
2. 同意画面で「同意する」をクリック
3. `/auth/callback?code=xxx` にリダイレクトされる

**期待結果**:
- トークンが正常に取得される
- ユーザー情報が取得される
- 所属部署情報が取得される
- セッションが作成される
- `/chat` にリダイレクトされる

#### 5. チャット画面

`http://localhost:5173/chat` にアクセス

**期待結果**:
- セッションがある場合、チャット画面が表示される
- ユーザー情報（表示名、所属部署）が表示される
- セッションがない場合、`/auth/login` にリダイレクトされる

#### 6. ログアウト

`http://localhost:5173/auth/logout` にPOSTリクエストを送信

**期待結果**:
- セッションが削除される
- Cookieがクリアされる
- ログイン画面またはホーム画面にリダイレクトされる

---

## ⚠️ 想定されるエラーと対処法

### エラー1: "環境変数の検証に失敗しました"

**原因**: `.env`ファイルに必要な環境変数が設定されていない

**対処法**:
1. `.env`ファイルを確認
2. 不足している環境変数を追加
3. 環境変数の形式を確認（UUID形式、URL形式など）

### エラー2: "AADSTS50011: The reply URL ... does not match"

**原因**: Azure PortalのリダイレクトURIと`.env`の`ENTRA_REDIRECT_URI`が一致しない

**対処法**:
1. Azure PortalでリダイレクトURIを確認
2. `.env`の`ENTRA_REDIRECT_URI`を修正
   - 開発環境: `http://localhost:5173/auth/callback`
3. Azure PortalでリダイレクトURIを追加

### エラー3: "所属部署が見つかりません"

**原因**: ユーザーが所属部署グループに所属していない、またはグループ名の形式が正しくない

**対処法**:
1. Azure Portalでユーザーがグループに所属しているか確認
2. グループ名が正しい形式か確認（例: `DEPT_001_営業部`）
3. `.env`の`GRAPH_DEPARTMENT_GROUP_PREFIX`が正しいか確認（デフォルト: `DEPT_`）

### エラー4: "トークンの取得に失敗しました"

**原因**: 
- クライアントシークレットが間違っている
- APIパーミッションが設定されていない
- 管理者の同意が付与されていない

**対処法**:
1. Azure Portalでクライアントシークレットを確認
2. `.env`の`ENTRA_CLIENT_SECRET`を更新
3. APIパーミッションを確認
4. 管理者の同意を付与

### エラー5: セッションが保持されない

**原因**: Cookie設定の問題

**対処法**:
1. `.env`のCookie設定を確認
   - `COOKIE_SECURE=false` (開発環境)
   - `COOKIE_HTTP_ONLY=true`
   - `COOKIE_SAME_SITE=lax`
2. ブラウザのCookie設定を確認
3. 開発者ツールでCookieが設定されているか確認

---

## 📊 確認項目チェックリスト

### 基本動作
- [ ] 開発サーバーが正常に起動する
- [ ] ホーム画面にアクセスできる
- [ ] ログイン画面にリダイレクトされる（セッションなし）
- [ ] ログイン画面からMicrosoft認証にリダイレクトされる

### 認証フロー
- [ ] Microsoftアカウントでログインできる
- [ ] 認証コードが正常に交換される
- [ ] ユーザー情報が取得できる
- [ ] 所属部署情報が取得できる
- [ ] セッションが作成される
- [ ] チャット画面にリダイレクトされる

### セッション管理
- [ ] セッションがCookieに保存される
- [ ] セッションが正しく取得できる
- [ ] セッションタイムアウトが動作する
- [ ] ログアウトでセッションが削除される

### トークン管理
- [ ] アクセストークンがセッションに保存される
- [ ] リフレッシュトークンがセッションに保存される
- [ ] トークンの有効期限が正しく設定される
- [ ] トークン自動更新が動作する（期限切れ前）

### エラーハンドリング
- [ ] 認証エラーが適切に処理される
- [ ] セッションエラーが適切に処理される
- [ ] エラーメッセージが表示される

---

## 🎯 完了基準

Phase 1は以下の条件をすべて満たした場合に完了とします：

- ✅ ログイン画面が表示される
- ✅ Microsoftアカウントでログインできる
- ✅ ユーザー情報が取得できる
- ✅ 所属コードが取得できる
- ✅ セッションが保存される
- ✅ ログアウトが動作する
- ✅ トークンが自動更新される（期限切れ前）

---

## 📝 確認結果

### 確認日時
- 日時: ___________

### 確認者
- 名前: ___________

### 確認結果
- [ ] すべての項目が正常に動作する
- [ ] 一部の項目で問題がある（詳細を記録）
- [ ] 重大な問題がある（詳細を記録）

### 問題点（あれば）
1. ___________
2. ___________
3. ___________

### 次のステップ
- [ ] Phase 2の実装を開始
- [ ] 問題を修正してからPhase 2に進む

---

**最終更新**: 2025年1月

