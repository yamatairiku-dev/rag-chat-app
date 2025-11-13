# API仕様

このドキュメントでは、プロジェクトで使用する各APIの仕様を説明します。

---

## Dify API仕様

### 共通設定

| 項目 | 値 |
|------|-----|
| Base URL | `{DIFY_API_URL}` |
| 認証方式 | Bearer Token (API Key) |
| Content-Type | `application/json` |
| タイムアウト | 30秒 |

### 認証ヘッダー

```bash
Authorization: Bearer app-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## エンドポイント一覧

### 1. POST /chat-messages (ブロッキングモード)

チャットメッセージを送信し、完全な応答を一度に受け取る。

#### Request

```typescript
interface DifyChatRequest {
  inputs: {
    user_id: string;        // ユーザーEmail (例: user@company.com)
    department_code: string; // 所属コード (例: 001)
  };
  query: string;            // ユーザーの質問
  response_mode: 'blocking';
  conversation_id?: string; // 既存の会話ID (新規の場合は空文字)
  user: string;             // ユーザー識別子 (通常はEmail)
}
```

#### Request Example

```bash
curl -X POST 'https://your-dify.com/v1/chat-messages' \
  -H 'Authorization: Bearer app-xxxxxxxx' \
  -H 'Content-Type: application/json' \
  -d '{
    "inputs": {
      "user_id": "tanaka@company.com",
      "department_code": "001"
    },
    "query": "年次有給休暇の取得方法を教えてください",
    "response_mode": "blocking",
    "conversation_id": "",
    "user": "tanaka@company.com"
  }'
```

#### Response

```typescript
interface DifyChatResponse {
  event: 'message';
  message_id: string;        // メッセージID (UUID)
  conversation_id: string;   // 会話ID (UUID)
  mode: 'chat';
  answer: string;            // AIの回答
  metadata: {
    usage: {
      prompt_tokens: number;
      prompt_unit_price: string;
      prompt_price_unit: string;
      prompt_price: string;
      completion_tokens: number;
      completion_unit_price: string;
      completion_price_unit: string;
      completion_price: string;
      total_tokens: number;
      total_price: string;
      currency: string;
      latency: number;
    };
    retriever_resources: Array<{
      position: number;
      dataset_id: string;
      dataset_name: string;
      document_id: string;
      document_name: string;
      segment_id: string;
      score: number;
      content: string;
    }>;
  };
  created_at: number;        // Unix timestamp
}
```

#### Response Example

```json
{
  "event": "message",
  "message_id": "5ad4cb98-f0c7-4085-b384-88c403be6290",
  "conversation_id": "45701982-8118-4bc5-8e9b-64562b4555f2",
  "mode": "chat",
  "answer": "年次有給休暇の取得方法は以下の通りです:\n\n1. 勤怠システムから申請\n2. 上長の承認を得る\n3. 承認後、休暇が確定",
  "metadata": {
    "usage": {
      "prompt_tokens": 1033,
      "prompt_unit_price": "0.001",
      "prompt_price_unit": "0.001033",
      "prompt_price": "0.001033",
      "completion_tokens": 135,
      "completion_unit_price": "0.002",
      "completion_price_unit": "0.00027",
      "completion_price": "0.00027",
      "total_tokens": 1168,
      "total_price": "0.001303",
      "currency": "USD",
      "latency": 1.381760165
    },
    "retriever_resources": []
  },
  "created_at": 1705395332
}
```

#### Error Response

```typescript
interface DifyErrorResponse {
  code: string;
  message: string;
  status: number;
}
```

#### Error Example

```json
{
  "code": "invalid_api_key",
  "message": "Invalid API key provided",
  "status": 401
}
```

---

### 2. POST /chat-messages (ストリーミングモード)

チャットメッセージを送信し、Server-Sent Events (SSE) でリアルタイムに応答を受け取る。

#### Request

```typescript
interface DifyStreamRequest {
  inputs: {
    user_id: string;
    department_code: string;
  };
  query: string;
  response_mode: 'streaming';
  conversation_id?: string;
  user: string;
}
```

#### Response (SSE Stream)

ストリーミングレスポンスは複数のイベントで構成されます。

##### イベント1: メッセージ開始

```typescript
interface MessageStartEvent {
  event: 'message';
  task_id: string;
  id: string;
  message_id: string;
  conversation_id: string;
  mode: 'chat';
  answer: '';
  created_at: number;
}
```

##### イベント2-N: メッセージチャンク（複数回送信）

```typescript
interface MessageChunkEvent {
  event: 'message';
  task_id: string;
  id: string;
  message_id: string;
  conversation_id: string;
  mode: 'chat';
  answer: string;  // 追加のテキスト
  created_at: number;
}
```

##### 最終イベント: メッセージ終了

```typescript
interface MessageEndEvent {
  event: 'message_end';
  task_id: string;
  id: string;
  message_id: string;
  conversation_id: string;
  mode: 'chat';
  metadata: {
    usage: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
      total_price: string;
      currency: string;
      latency: number;
    };
    retriever_resources: Array<any>;
  };
  created_at: number;
}
```

##### エラーイベント

```typescript
interface ErrorEvent {
  event: 'error';
  task_id: string;
  message_id: string;
  status: number;
  code: string;
  message: string;
}
```

#### SSE Stream Example

```
data: {"event": "message", "task_id": "abc123", "id": "msg1", "message_id": "5ad4cb98", "conversation_id": "45701982", "mode": "chat", "answer": "", "created_at": 1705395332}

data: {"event": "message", "task_id": "abc123", "id": "msg1", "message_id": "5ad4cb98", "conversation_id": "45701982", "mode": "chat", "answer": "年次有給", "created_at": 1705395332}

data: {"event": "message", "task_id": "abc123", "id": "msg1", "message_id": "5ad4cb98", "conversation_id": "45701982", "mode": "chat", "answer": "休暇の取得", "created_at": 1705395332}

data: {"event": "message", "task_id": "abc123", "id": "msg1", "message_id": "5ad4cb98", "conversation_id": "45701982", "mode": "chat", "answer": "方法は以下の通りです", "created_at": 1705395332}

data: {"event": "message_end", "task_id": "abc123", "id": "msg1", "message_id": "5ad4cb98", "conversation_id": "45701982", "mode": "chat", "metadata": {"usage": {"prompt_tokens": 1033, "completion_tokens": 135, "total_tokens": 1168, "total_price": "0.001303", "currency": "USD", "latency": 1.38}}, "created_at": 1705395332}
```

---

### 3. GET /conversations/:conversation_id/messages

会話履歴を取得する。

#### Request

```bash
GET {DIFY_API_URL}/conversations/{conversation_id}/messages?user=user@company.com&limit=20
Authorization: Bearer app-xxxxxxxx
```

#### Query Parameters

| パラメータ | 必須 | デフォルト | 説明 |
|-----------|------|-----------|------|
| `user` | ✅ | - | ユーザー識別子 |
| `limit` | ❌ | 20 | 取得件数 (最大: 100) |
| `first_id` | ❌ | - | ページネーション用の最初のメッセージID |

#### Response

```typescript
interface ConversationMessagesResponse {
  limit: number;
  has_more: boolean;
  data: Array<{
    id: string;
    conversation_id: string;
    inputs: {
      user_id: string;
      department_code: string;
    };
    query: string;
    answer: string;
    feedback: null | {
      rating: 'like' | 'dislike';
    };
    retriever_resources: Array<any>;
    created_at: number;
  }>;
}
```

---

### 4. DELETE /conversations/:conversation_id

会話を削除する。

#### Request

```bash
DELETE {DIFY_API_URL}/conversations/{conversation_id}?user=user@company.com
Authorization: Bearer app-xxxxxxxx
```

#### Response

```typescript
interface DeleteConversationResponse {
  result: 'success';
}
```

---

## Microsoft Graph API仕様

### 共通設定

| 項目 | 値 |
|------|-----|
| Base URL | `https://graph.microsoft.com/v1.0` |
| 認証方式 | Bearer Token (Access Token) |
| Content-Type | `application/json` |

### 認証ヘッダー

```bash
Authorization: Bearer {access_token}
```

---

## エンドポイント一覧

### 1. GET /me

現在のユーザー情報を取得する。

#### Request

```bash
GET https://graph.microsoft.com/v1.0/me
Authorization: Bearer {access_token}
```

#### Response

```typescript
interface GraphUser {
  id: string;                     // User Object ID
  userPrincipalName: string;      // user@company.com
  displayName: string;            // 表示名 (例: 田中 太郎)
  givenName: string;              // 名 (例: 太郎)
  surname: string;                // 姓 (例: 田中)
  mail: string;                   // メールアドレス
  jobTitle?: string;              // 役職
  department?: string;            // 部署名
  officeLocation?: string;        // オフィス所在地
  mobilePhone?: string;           // 携帯電話番号
  businessPhones: string[];       // 業務用電話番号
}
```

---

### 2. GET /me/memberOf

ユーザーが所属するグループを取得する。

#### Request

```bash
GET https://graph.microsoft.com/v1.0/me/memberOf
Authorization: Bearer {access_token}
```

#### Response

```typescript
interface MemberOfResponse {
  '@odata.context': string;
  value: Array<{
    '@odata.type': '#microsoft.graph.group';
    id: string;                  // Group Object ID
    displayName: string;         // グループ名 (例: DEPT_001_営業部)
    description?: string;        // グループの説明
    mail?: string;               // グループメールアドレス
  }>;
}
```

#### 使用例（所属コード抽出）

```typescript
// グループ名から所属コードを抽出
// 例: "DEPT_001_営業部" → "001"
const groups = response.value;
const prefix = process.env.GRAPH_DEPARTMENT_GROUP_PREFIX; // "DEPT_"

const departmentGroup = groups.find(g => 
  g.displayName.startsWith(prefix)
);

if (departmentGroup) {
  const parts = departmentGroup.displayName.split('_');
  const departmentCode = parts[1]; // "001"
}
```

---

## 内部API仕様（React Router Actions/Loaders）

### 1. POST /api/chat (action)

チャットメッセージを送信する。

#### Request (FormData)

```typescript
interface ChatActionRequest {
  query: string;              // ユーザーの質問
  conversation_id?: string;   // 既存の会話ID
  mode: 'blocking' | 'streaming';
}
```

#### Response (blocking mode)

```typescript
interface ChatActionResponse {
  success: boolean;
  answer?: string;
  conversationId?: string;
  messageId?: string;
  error?: string;
}
```

#### Response (streaming mode)

```typescript
// SSEストリームを返す
// Content-Type: text/event-stream
```

---

### 2. GET /api/conversations (loader)

会話履歴一覧を取得する。

#### Response

```typescript
interface ConversationsResponse {
  conversations: Array<{
    id: string;
    title: string;
    lastMessage: string;
    createdAt: number;
    updatedAt: number;
  }>;
}
```

---

### 3. DELETE /api/conversations/:id (action)

会話を削除する。

#### Response

```typescript
interface DeleteConversationResponse {
  success: boolean;
  error?: string;
}
```

---

## エラーハンドリング

### Dify APIエラーコード

| コード | HTTPステータス | 説明 | 対処方法 |
|--------|---------------|------|----------|
| `invalid_api_key` | 401 | API Keyが無効 | 環境変数を確認 |
| `unauthorized` | 401 | 認証エラー | トークンを再取得 |
| `conversation_not_found` | 404 | 会話が存在しない | 会話IDを確認 |
| `rate_limit_exceeded` | 429 | レート制限超過 | リトライ処理を実装 |
| `internal_server_error` | 500 | サーバーエラー | リトライまたはサポート連絡 |

### Microsoft Graph APIエラーコード

| コード | HTTPステータス | 説明 | 対処方法 |
|--------|---------------|------|----------|
| `InvalidAuthenticationToken` | 401 | トークンが無効 | トークンを再取得 |
| `ExpiredAuthenticationToken` | 401 | トークン期限切れ | リフレッシュトークンで更新 |
| `InsufficientPermissions` | 403 | 権限不足 | APIパーミッションを確認 |
| `ResourceNotFound` | 404 | リソースが見つからない | リクエストURLを確認 |
| `TooManyRequests` | 429 | リクエスト過多 | Retry-Afterヘッダーを確認 |

---

## リトライ戦略

### 推奨リトライポリシー

```typescript
interface RetryPolicy {
  maxRetries: 3;
  baseDelay: 1000;  // 1秒
  maxDelay: 10000;  // 10秒
  backoffMultiplier: 2;  // 指数バックオフ
}

// リトライ対象のHTTPステータス
const retryableStatuses = [408, 429, 500, 502, 503, 504];
```

### 実装例

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  policy: RetryPolicy
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= policy.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < policy.maxRetries) {
        const delay = Math.min(
          policy.baseDelay * Math.pow(policy.backoffMultiplier, attempt),
          policy.maxDelay
        );
        await sleep(delay);
      }
    }
  }
  
  throw lastError!;
}
```

---

## タイムアウト設定

### 推奨タイムアウト値

| API | タイムアウト | 理由 |
|-----|------------|------|
| Dify (blocking) | 30秒 | RAG検索と生成に時間がかかる |
| Dify (streaming) | 60秒 | 長い応答の生成に対応 |
| Graph API | 10秒 | ユーザー情報取得は高速 |

---

**関連ドキュメント:**
- [型定義](./07_型定義.md)
- [エラーハンドリング](./06_エラーハンドリング.md)
- [実装ガイド Phase 2](./09_実装ガイド_Phase2.md)

**最終更新**: 2025年11月
