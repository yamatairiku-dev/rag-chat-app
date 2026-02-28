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

---

## 2. GET /me — ユーザー情報

### 取得データ（Graph API レスポンス）

| フィールド | 型 | 必須 | 説明 |
|------------|-----|------|------|
| `id` | string | ✅ | User Object ID |
| `userPrincipalName` | string | ✅ | UPN（例: user@company.com） |
| `displayName` | string | ✅ | 表示名（例: 田中 太郎） |
| `givenName` | string | ✅ | 名 |
| `surname` | string | ✅ | 姓 |
| `mail` | string | ✅ | メールアドレス |
| `jobTitle` | string | - | 役職 |
| `department` | string | - | 部署名（Azure AD のユーザー属性） |
| `officeLocation` | string | - | オフィス所在地 |
| `mobilePhone` | string | - | 携帯電話番号 |
| `businessPhones` | string[] | ✅ | 業務用電話番号 |

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

| フィールド | 型 | 説明 |
|------------|-----|------|
| `@odata.context` | string | OData コンテキスト |
| `value` | 配列 | グループオブジェクトの配列 |

各グループ要素（`GraphGroup`）:

| フィールド | 型 | 説明 |
|------------|-----|------|
| `@odata.type` | string | `#microsoft.graph.group` |
| `id` | string | Group Object ID |
| `displayName` | string | グループ名（例: DEPT_001_営業部） |
| `description` | string | グループの説明（任意） |
| `mail` | string | グループメール（任意） |

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
| `departmentCodes`（配列） | `UserSession.departmentCodes` | Dify API の `department_code`（カンマ区切り）、UI 表示 |
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
5. createSession({ userId, userEmail, displayName, departmentCode, departmentName, ... })
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
| `departmentCode` | Dify API の `inputs.department_code`、ヘッダー表示、設定・会話一覧 |
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
