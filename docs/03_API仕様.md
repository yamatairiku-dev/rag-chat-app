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
    displayName: string;         // グループ名（表示名。形式は任意）
    description?: string;        // グループの説明
    mail?: string;               // グループメールアドレス
  }>;
}
```

#### 使用例（所属情報の取得）

```typescript
// 正規表現に一致するグループを部署として採用
const groups = response.value;
const pattern = process.env.GRAPH_DEPARTMENT_GROUP_PREFIX; // 例: "^ZA[A-Za-z]\\d{3}-[A-Za-z]"
const departmentRegex = new RegExp(pattern);

const departmentGroup = groups.find(g =>
  g.displayName && departmentRegex.test(g.displayName)
);

if (departmentGroup) {
  const departmentCode = departmentGroup.id;   // グループの Object ID
  const departmentName = departmentGroup.displayName; // 表示名をそのまま使用
}
```

---

## 内部API仕様（React Router Actions/Loaders）

### チャットメッセージ送信エンドポイント

このプロジェクトでは、チャットメッセージ送信のために**2つのエンドポイント**を提供しています：

1. **`POST /api/chat-stream`** - ストリーミングモード（推奨）
2. **`POST /chat` (action)** - ブロッキングモード

#### 使い分け

| エンドポイント | モード | 用途 | レスポンス形式 |
|--------------|--------|------|--------------|
| `/api/chat-stream` | ストリーミング | リアルタイムチャットUI（現在の実装で使用） | SSE (Server-Sent Events) |
| `/chat` (action) | ブロッキング | フォーム送信型のUI | JSON |

**推奨**: ユーザー体験を重視する場合は `/api/chat-stream` を使用してください。

---

### 1. POST /api/chat-stream (ストリーミングモード)

チャットメッセージを送信し、Server-Sent Events (SSE) でリアルタイムに応答を受け取る。

#### Request

```typescript
interface ChatStreamRequest {
  query: string;              // ユーザーの質問
  conversationId?: string;    // 既存の会話ID（新規の場合は空文字または省略）
}
```

#### Request Example

```bash
curl -X POST 'http://localhost/api/chat-stream' \
  -H 'Content-Type: application/json' \
  -H 'Cookie: session=xxx' \
  -d '{
    "query": "年次有給休暇の取得方法を教えてください",
    "conversationId": ""
  }'
```

#### Response (SSE Stream)

**Content-Type**: `text/event-stream; charset=utf-8`

ストリーミングレスポンスは複数のイベントで構成されます。

##### イベント1-N: メッセージチャンク（複数回送信）

```typescript
interface MessageChunkEvent {
  event: 'message';
  task_id: string;
  id: string;
  message_id: string;
  conversation_id: string;
  mode: 'chat';
  answer: string;  // 追加のテキスト（累積ではない）
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

##### 完了イベント

```typescript
interface DoneEvent {
  event: 'done';
}
```

##### エラーイベント

```typescript
interface ErrorEvent {
  event: 'error';
  message: string;
  code?: number;
}
```

#### SSE Stream Example

```
data: {"event": "message", "task_id": "abc123", "id": "msg1", "message_id": "5ad4cb98", "conversation_id": "45701982", "mode": "chat", "answer": "年次有給", "created_at": 1705395332}

data: {"event": "message", "task_id": "abc123", "id": "msg1", "message_id": "5ad4cb98", "conversation_id": "45701982", "mode": "chat", "answer": "休暇の取得", "created_at": 1705395332}

data: {"event": "message_end", "task_id": "abc123", "id": "msg1", "message_id": "5ad4cb98", "conversation_id": "45701982", "mode": "chat", "metadata": {...}, "created_at": 1705395332}

data: {"event": "done"}
```

#### 使用例（フロントエンド）

```typescript
const response = await fetch("/api/chat-stream", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    query: "質問内容",
    conversationId: "既存の会話IDまたは空文字",
  }),
});

const reader = response.body.getReader();
const decoder = new TextDecoder("utf-8");
let buffer = "";

while (true) {
  const { value, done } = await reader.read();
  if (done) break;
  
  buffer += decoder.decode(value, { stream: true });
  const events = buffer.split("\n\n");
  buffer = events.pop() ?? "";
  
  for (const eventChunk of events) {
    const dataLine = eventChunk.split("\n").find(line => line.startsWith("data:"));
    if (!dataLine) continue;
    
    const payload = JSON.parse(dataLine.slice(5).trim());
    
    if (payload.event === "message") {
      // チャンクを逐次表示
      console.log("チャンク:", payload.answer);
    } else if (payload.event === "message_end") {
      // メッセージ完了
      console.log("完了:", payload.metadata);
    } else if (payload.event === "done") {
      // ストリーム終了
      break;
    }
  }
}
```

---

### 2. POST /chat (action) - ブロッキングモード

チャットメッセージを送信し、完全な応答を一度に受け取る。React Routerの `action` 関数として実装。

#### Request (FormData)

```typescript
interface ChatActionRequest {
  query: string;              // ユーザーの質問
  conversation_id?: string;   // 既存の会話ID（新規の場合は空文字または省略）
}
```

#### Request Example

```bash
curl -X POST 'http://localhost/chat' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -H 'Cookie: session=xxx' \
  -d 'query=年次有給休暇の取得方法を教えてください&conversation_id='
```

または、React Routerの `<Form>` コンポーネントを使用：

```typescript
<Form method="post">
  <input name="query" type="text" />
  <input name="conversation_id" type="hidden" value={conversationId || ""} />
  <button type="submit">送信</button>
</Form>
```

#### Response

```typescript
interface ChatActionResponse {
  success: boolean;
  answer?: string;            // AIの回答（完全なテキスト）
  conversationId?: string;    // 会話ID
  messageId?: string;         // メッセージID
  error?: string;            // エラーメッセージ（success: falseの場合）
  errorId?: string;          // エラーID（デバッグ用）
}
```

#### Response Example (Success)

```json
{
  "success": true,
  "answer": "年次有給休暇の取得方法は以下の通りです:\n\n1. 勤怠システムから申請\n2. 上長の承認を得る\n3. 承認後、休暇が確定",
  "conversationId": "45701982-8118-4bc5-8e9b-64562b4555f2",
  "messageId": "5ad4cb98-f0c7-4085-b384-88c403be6290"
}
```

#### Response Example (Error)

```json
{
  "success": false,
  "error": "メッセージを入力してください。",
  "errorId": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### 使用例（フロントエンド）

```typescript
// React Routerの useActionData を使用
const actionData = useActionData<ChatActionResponse>();

// または、fetch APIを使用
const formData = new FormData();
formData.append("query", "質問内容");
formData.append("conversation_id", conversationId || "");

const response = await fetch("/chat", {
  method: "POST",
  body: formData,
});

const data = await response.json();
if (data.success) {
  console.log("回答:", data.answer);
} else {
  console.error("エラー:", data.error);
}
```

---

### 3. POST /api/chat-stream (ストリーミングモード)

チャットメッセージを送信し、Server-Sent Events (SSE) 形式でストリーミング応答を受け取る。

#### Request

```typescript
interface ChatStreamRequest {
  query: string;              // ユーザーの質問
  conversationId?: string;    // 既存の会話ID（新規の場合は空文字または省略）
}
```

#### Request Example

```bash
curl -X POST 'http://localhost/api/chat-stream' \
  -H 'Content-Type: application/json' \
  -H 'Cookie: session=xxx' \
  -d '{
    "query": "年次有給休暇の取得方法を教えてください",
    "conversationId": ""
  }'
```

または、JavaScriptで使用：

```typescript
const response = await fetch("/api/chat-stream", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    query: "年次有給休暇の取得方法を教えてください",
    conversationId: "",
  }),
});

const reader = response.body?.getReader();
const decoder = new TextDecoder("utf-8");
let buffer = "";

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  buffer += decoder.decode(value, { stream: true });
  const events = buffer.split("\n\n");
  buffer = events.pop() ?? "";

  for (const eventChunk of events) {
    const dataLine = eventChunk
      .split("\n")
      .find((line) => line.startsWith("data:"));
    if (!dataLine) continue;

    const payload = JSON.parse(dataLine.slice(5).trim());
    if (payload.event === "message") {
      console.log("部分的な回答:", payload.answer);
    } else if (payload.event === "message_end") {
      console.log("会話ID:", payload.conversation_id);
    } else if (payload.event === "error") {
      console.error("エラー:", payload.message);
    } else if (payload.event === "done") {
      console.log("ストリーミング完了");
    }
  }
}
```

#### Response (SSE形式)

レスポンスはServer-Sent Events (SSE) 形式で返されます。

##### イベントタイプ

1. **`message`** - 部分的な回答を受信
   ```json
   {
     "event": "message",
     "answer": "年次有給休暇の取得方法は",
     "conversation_id": "45701982-8118-4bc5-8e9b-64562b4555f2",
     "message_id": "5ad4cb98-f0c7-4085-b384-88c403be6290",
     "mode": "chat",
     "task_id": "task-123",
     "id": "evt-1",
     "created_at": 1704067200000
   }
   ```

2. **`message_end`** - メッセージの終了
   ```json
   {
     "event": "message_end",
     "conversation_id": "45701982-8118-4bc5-8e9b-64562b4555f2",
     "message_id": "5ad4cb98-f0c7-4085-b384-88c403be6290",
     "mode": "chat",
     "task_id": "task-123",
     "id": "evt-2",
     "metadata": {
       "usage": {
         "prompt_tokens": 100,
         "completion_tokens": 200,
         "total_tokens": 300,
         "total_price": "0.01",
         "currency": "JPY",
         "latency": 1.5
       },
       "retriever_resources": []
     },
     "created_at": 1704067201000
   }
   ```

3. **`error`** - エラー発生
   ```json
   {
     "event": "error",
     "message": "エラーメッセージ",
     "code": "error_code"
   }
   ```

4. **`done`** - ストリーミング完了
   ```json
   {
     "event": "done"
   }
   ```

#### エラーレスポンス

##### 400 Bad Request

```json
{
  "error": "メッセージを入力してください。"
}
```

または

```json
{
  "error": "メッセージが長すぎます（最大 2000 文字）。"
}
```

##### 401 Unauthorized

セッションが無効または期限切れの場合、レスポンスボディなしで401を返します。

##### 405 Method Not Allowed

POST以外のメソッドでリクエストした場合。

---

### 4. GET /conversations (loader)

会話履歴一覧を取得する。

#### Query Parameters

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `limit` | number | いいえ | 取得件数（デフォルト: 20、最大: 100） |

#### Response

```typescript
interface ConversationsResponse {
  user: {
    displayName: string;
    userEmail: string;
    departmentCode: string;
    departmentName?: string;
  };
  conversations: Array<{
    conversationId: string;
    userId: string;
    departmentCode: string;
    createdAt: number;
    updatedAt: number;
    messages: Array<{
      id: string;
      role: "user" | "assistant";
      content: string;
      timestamp: number;
      error?: string;
    }>;
  }>;
}
```

#### Response Example

```json
{
  "user": {
    "displayName": "田中太郎",
    "userEmail": "tanaka@company.com",
    "departmentCode": "001",
    "departmentName": "営業部"
  },
  "conversations": [
    {
      "conversationId": "45701982-8118-4bc5-8e9b-64562b4555f2",
      "userId": "user-123",
      "departmentCode": "001",
      "createdAt": 1704067200000,
      "updatedAt": 1704067201000,
      "messages": [
        {
          "id": "msg-1",
          "role": "user",
          "content": "年次有給休暇の取得方法を教えてください",
          "timestamp": 1704067200000
        },
        {
          "id": "msg-2",
          "role": "assistant",
          "content": "年次有給休暇の取得方法は以下の通りです...",
          "timestamp": 1704067201000
        }
      ]
    }
  ]
}
```

---

### 5. DELETE /conversations (action)

会話を削除する。

#### Request

```typescript
interface DeleteConversationRequest {
  action: "delete";
  conversation_id: string;
}
```

#### Request Example

```bash
curl -X POST 'http://localhost/conversations' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -H 'Cookie: session=xxx' \
  -d 'action=delete&conversation_id=45701982-8118-4bc5-8e9b-64562b4555f2'
```

#### Response

##### Success (200 OK)

```json
{
  "success": true
}
```

##### Error (400 Bad Request)

```json
{
  "success": false,
  "error": "会話IDが指定されていません。"
}
```

##### Error (404 Not Found)

```json
{
  "success": false,
  "error": "会話が見つかりません。"
}
```

---

### 6. GET /settings (loader)

ユーザー設定情報を取得する。

#### Response

```typescript
interface SettingsResponse {
  user: {
    displayName: string;
    userEmail: string;
    departmentCode: string;
    departmentName?: string;
  };
}
```

---

### 7. POST /auth/logout (action)

ログアウト処理を実行する。

#### Response

302リダイレクト（`/auth/login`へ）

---

### 8. POST /api/test-auth (action) - テスト環境専用

テスト環境でのみ使用可能な認証エンドポイント。E2Eテストで使用。

#### Request

```typescript
interface TestAuthRequest {
  userId?: string;
  userEmail?: string;
  displayName?: string;
  departmentCode?: string;
  departmentName?: string;
}
```

#### Response

```typescript
interface TestAuthResponse {
  success: boolean;
  sessionId: string;
}
```

**注意**: 本番環境では403エラーを返します。

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
