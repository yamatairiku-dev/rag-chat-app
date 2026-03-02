# Graph API 取得情報の整理

本アプリで Microsoft Graph API から取得する情報と、その利用先をまとめます。

---

## 1. 利用エンドポイント一覧

| エンドポイント | メソッド | 用途 | 呼び出し元 |
|----------------|----------|------|------------|
| `/me` | GET | 現在のユーザー情報 | `getUserInfo()` |
| `/me/memberOf` | GET | ユーザー所属グループ一覧 | `getUserDepartment()` |

- **実装**: `app/lib/graph/user-service.ts`
- **認証**: Bearer Token（Entra ID の Access Token）
- **Base URL**: 環境変数 `GRAPH_API_URL`（デフォルト: `https://graph.microsoft.com/v1.0`）
- **最適化**: `$select`クエリパラメータを使用して、実際に使用するフィールドのみを取得（パフォーマンスとセキュリティの向上）

---

## 2. GET /me — ユーザー情報

### 取得データ（Graph API レスポンス）

**重要**: `$select`クエリパラメータを使用して、実際に使用するフィールドのみを取得しています。これにより、レスポンスサイズの削減、パフォーマンスの向上、セキュリティの強化を実現しています。

| フィールド | 型 | 必須 | 説明 | 取得有無 |
|------------|-----|------|------|---------|
| `id` | string | ✅ | User Object ID | ✅ 取得 |
| `userPrincipalName` | string | ✅ | UPN（例: user@company.com） | ✅ 取得 |
| `displayName` | string | ✅ | 表示名（例: 田中 太郎） | ✅ 取得 |
| `mail` | string | ✅ | メールアドレス | ✅ 取得 |
| `givenName` | string | - | 名 | ❌ 取得しない |
| `surname` | string | - | 姓 | ❌ 取得しない |
| `jobTitle` | string | - | 役職 | ❌ 取得しない |
| `department` | string | - | 部署名（Azure AD のユーザー属性） | ❌ 取得しない |
| `officeLocation` | string | - | オフィス所在地 | ❌ 取得しない |
| `mobilePhone` | string | - | 携帯電話番号 | ❌ 取得しない |
| `businessPhones` | string[] | - | 業務用電話番号 | ❌ 取得しない |

### アプリでの利用

| Graph フィールド | セッション / 利用先 | 用途 |
|------------------|----------------------|------|
| `id` | `UserSession.userId` | ユーザー識別・セッション紐付け |
| `mail` または `userPrincipalName` | `UserSession.userEmail` | 表示・Dify API の `user_id` など |
| `displayName` | `UserSession.displayName` | ヘッダー表示・UI |

**型定義**: `app/types/graph.ts` の `GraphUser`

---

## 3. GET /me/memberOf — 所属グループ

### 取得データ（Graph API レスポンス）

**重要**: `$select`クエリパラメータを使用して、実際に使用するフィールドのみを取得しています。これにより、レスポンスサイズの削減、パフォーマンスの向上、セキュリティの強化を実現しています。

| フィールド | 型 | 説明 | 取得有無 |
|------------|-----|------|---------|
| `@odata.context` | string | OData コンテキスト | ✅ 自動取得 |
| `value` | 配列 | グループオブジェクトの配列 | ✅ 自動取得 |

各グループ要素（`GraphGroup`）:

| フィールド | 型 | 説明 | 取得有無 |
|------------|-----|------|---------|
| `@odata.type` | string | `#microsoft.graph.group` | ❌ 取得しない |
| `id` | string | Group Object ID | ✅ 取得 |
| `displayName` | string | グループ名（例: DEPT_001_営業部） | ✅ 取得 |
| `description` | string | グループの説明（任意） | ❌ 取得しない |
| `mail` | string | グループメール（任意） | ❌ 取得しない |

### アプリでの加工・利用

1. **部署グループの特定**  
   環境変数 `GRAPH_DEPARTMENT_GROUP_PREFIX` に**正規表現パターン**を指定し、グループの `displayName` がその正規表現にマッチするものを「部署グループ」として採用する。  
   デフォルト: `^ZA[A-Za-z]\d{3}-[A-Za-z]`（先頭2文字が ZA、3文字目が英字、4–6文字目が数字、7文字目がハイフン、8文字目が英字）。

2. **部署コード・部署名の設定**  
   グループ名の分割は行わず、次のようにそのまま利用する。
   - **部署コード**: グループの `id`（Azure AD の Group Object ID）
   - **部署名**: グループの `displayName`（表示名をそのまま使用）

3. **セッション・API へのマッピング**

| 抽出結果 | セッション / 利用先 | 用途 |
|----------|----------------------|------|
| `departmentIds`（配列） | `UserSession.departmentIds` | 会話ストアでのユーザー識別（Graph APIのgroup.idのリスト） |
| `departmentNames`（配列） | `UserSession.departmentNames` | ヘッダー等の表示 |
| `groupId` | （code と同一） | 必要に応じて参照 |
| `groupName` | （name と同一） | 必要に応じて参照 |

**型定義**: `app/types/graph.ts` の `MemberOfResponse`, `GraphGroup`, `DepartmentInfo`

---

## 4. 取得〜利用の流れ（認証時）

```
1. 認証コールバック (app/routes/auth.tsx)
   ↓
2. exchangeCodeForTokens() → Access Token 取得
   ↓
3. getUserInfo(accessToken)     → GET /me
   → userId, userEmail, displayName を取得
   ↓
4. getUserDepartment(accessToken) → GET /me/memberOf
   → 正規表現にマッチする**すべての**グループを配列で取得
   → 部署コード・部署名の配列をセッションに保存
   ↓
5. createSession({ userId, userEmail, displayName, departmentIds, departmentNames, ... })
   ↓
6. セッションに保存。以降はチャット・Dify API・設定画面などで利用。
```

- 部署グループが見つからない、または形式が不正な場合は `getUserDepartment()` が `null` を返し、認証は **403** で失敗します。

---

## 5. セッション以降の利用先

| 情報 | 利用箇所 |
|------|----------|
| `userId` | セッション識別、会話ストア |
| `userEmail` | Dify API の `user` パラメータ、設定画面 |
| `displayName` | ヘッダー、設定画面 |
| `departmentIds` | 会話ストアでのユーザー識別（Graph APIのgroup.idのリスト） |
| `departmentNames` | Dify API の `inputs.department_names`（カンマ区切り）、ヘッダー表示、設定・会話一覧 |
| `departmentName` | ヘッダー表示（部署名 (コード) の形式） |

---

## 6. 関連する環境変数

| 変数名 | デフォルト | 説明 |
|--------|------------|------|
| `GRAPH_API_URL` | `https://graph.microsoft.com/v1.0` | Graph API のベース URL |
| `GRAPH_API_SCOPE` | `https://graph.microsoft.com/.default` | トークン取得時のスコープ |
| `GRAPH_DEPARTMENT_GROUP_PREFIX` | `^ZA[A-Za-z]\d{3}-[A-Za-z]` | 部署グループの表示名にマッチさせる正規表現パターン |

---

## 7. 型・実装の対応表

| 種別 | 定義場所 | 説明 |
|------|----------|------|
| `GraphUser` | `app/types/graph.ts` | GET /me のレスポンス型 |
| `GraphGroup` | `app/types/graph.ts` | グループ 1 件の型 |
| `MemberOfResponse` | `app/types/graph.ts` | GET /me/memberOf のレスポンス型 |
| `DepartmentInfo` | `app/types/graph.ts` | 抽出後の部署情報（code, name, groupId, groupName） |
| `UserSession` | `app/types/session.ts` | セッションに保持するユーザー・部署情報 |
| `getUserInfo` | `app/lib/graph/user-service.ts` | ユーザー情報取得 |
| `getUserDepartment` | `app/lib/graph/user-service.ts` | 所属部署情報取得 |

詳細な API 仕様（リクエスト例・エラーコード等）は `docs/03_API仕様.md` の「Microsoft Graph API仕様」を参照してください。

---

## 8. パフォーマンス最適化

### $selectクエリパラメータの使用

本アプリでは、Microsoft Graph APIの`$select`クエリパラメータを使用して、実際に使用するフィールドのみを取得しています。

**メリット**:
- ✅ **レスポンスサイズの削減**: 不要なデータを取得しないことで、ネットワーク転送量を削減
- ✅ **パフォーマンスの向上**: レスポンス処理時間の短縮
- ✅ **セキュリティの強化**: 不要な個人情報を取得しないことで、情報漏洩リスクを低減
- ✅ **API呼び出しコストの削減**: Microsoft Graph APIの使用量を最適化

**実装例**:
```typescript
// GET /me - 必要なフィールドのみを取得
const user = await client
  .api('/me')
  .select(['id', 'mail', 'userPrincipalName', 'displayName'])
  .get();

// GET /me/memberOf - 必要なフィールドのみを取得
const response = await client
  .api('/me/memberOf')
  .select(['id', 'displayName'])
  .get();
```
