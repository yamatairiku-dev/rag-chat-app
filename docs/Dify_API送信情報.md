# Dify API送信情報

**作成日**: 2025年12月5日  
**目的**: Dify APIに送信している情報の詳細を記録

---

## 📋 概要

このアプリケーションは、Dify APIに対して以下の2つのモードでリクエストを送信しています：

1. **ストリーミングモード** (`response_mode: "streaming"`) - リアルタイムで応答を受信
2. **ブロッキングモード** (`response_mode: "blocking"`) - 完全な応答を一度に受信

---

## 🔐 認証情報

### HTTPヘッダー

```http
Authorization: Bearer {DIFY_API_KEY}
Content-Type: application/json
```

- **`DIFY_API_KEY`**: 環境変数から取得（`app-`で始まる形式）
- **`DIFY_API_URL`**: 環境変数から取得（例: `https://your-dify.com/v1`）

---

## 📤 リクエストボディ（共通）

### 基本構造

```typescript
{
  inputs: {
    user_id: string;        // ユーザーのEmailアドレス
    department_names: string; // 所属部署名（カンマ区切り）
  },
  query: string;            // ユーザーの質問（トリム済み）
  response_mode: "streaming" | "blocking",
  conversation_id?: string; // 会話ID（新規の場合は空文字列）
  user: string;            // ユーザー識別子（Emailアドレス）
}
```

---

## 📊 ストリーミングモード

### エンドポイント

```
POST {DIFY_API_URL}/chat-messages
```

### 実装箇所

- **ルート**: `app/routes/api.chat-stream.ts`
- **クライアント**: `app/lib/dify/client.ts` → `streamMessage()` メソッド

### 送信される情報

```typescript
{
  inputs: {
    user_id: session.userEmail,        // セッションから取得したユーザーEmail
    department_names: session.departmentNames.join(","), // セッションから取得した部署名（カンマ区切り）
  },
  query: trimmedQuery,                 // ユーザーが入力した質問（前後の空白を削除）
  response_mode: "streaming",
  conversation_id: initialConversationId, // 既存の会話ID、または空文字列
  user: session.userEmail,              // ユーザー識別子（Email）
}
```

### 実際の送信例

```json
{
  "inputs": {
    "user_id": "tanaka@company.com",
    "department_names": "ZAA535-A,ZAA090-A"
  },
  "query": "年次有給休暇の取得方法を教えてください",
  "response_mode": "streaming",
  "conversation_id": "",
  "user": "tanaka@company.com"
}
```

### コード参照

```119:128:app/routes/api.chat-stream.ts
        for await (const event of client.streamMessage({
          inputs: {
            user_id: session.userEmail,
            department_names: session.departmentNames.join(","),
          },
          query: trimmedQuery,
          response_mode: "streaming",
          conversation_id: initialConversationId,
          user: session.userEmail,
        })) {
```

---

## 📊 ブロッキングモード

### エンドポイント

```
POST {DIFY_API_URL}/chat-messages
```

### 実装箇所

- **ルート**: `app/routes/chat.tsx` → `action()` 関数
- **クライアント**: `app/lib/dify/client.ts` → `sendMessage()` メソッド

### 送信される情報

```typescript
{
  inputs: {
    user_id: session.userEmail,        // セッションから取得したユーザーEmail
    department_names: session.departmentNames.join(","), // セッションから取得した部署名（カンマ区切り）
  },
  query: trimmedQuery,                 // ユーザーが入力した質問（前後の空白を削除）
  response_mode: "blocking",
  conversation_id: conversationId || "", // フォームから取得した会話ID、または空文字列
  user: session.userEmail,              // ユーザー識別子（Email）
}
```

### 実際の送信例

```json
{
  "inputs": {
    "user_id": "tanaka@company.com",
    "department_names": "ZAA535-A,ZAA090-A"
  },
  "query": "年次有給休暇の取得方法を教えてください",
  "response_mode": "blocking",
  "conversation_id": "",
  "user": "tanaka@company.com"
}
```

### コード参照

```135:144:app/routes/chat.tsx
    const response = await client.sendMessage({
      inputs: {
        user_id: session.userEmail,
        department_names: session.departmentNames.join(","),
      },
      query: trimmedQuery,
      response_mode: "blocking",
      conversation_id: conversationId || "",
      user: session.userEmail,
    });
```

---

## 🔍 データの取得元

### セッション情報

セッションから取得される情報：

- **`session.userEmail`**: Entra ID認証時に取得したユーザーのEmailアドレス
- **`session.departmentNames`**: Graph APIから取得した部署名の配列（カンマ区切りで`department_names`として送信）
- **`session.userId`**: ユーザーの一意ID

### フォームデータ

フォームから取得される情報：

- **`query`**: ユーザーが入力したメッセージ
- **`conversation_id`**: 既存の会話ID（新規の場合は空文字列）

---

## ✅ バリデーション

### クエリの検証

1. **空文字チェック**: 空白のみのメッセージは送信されない
2. **最大文字数チェック**: `MAX_MESSAGE_LENGTH`（デフォルト: 2000文字）を超えるメッセージは送信されない
3. **トリム処理**: 前後の空白を削除

### コード参照

```72:93:app/routes/api.chat-stream.ts
  if (typeof query !== "string" || !query.trim()) {
    return new Response(
      JSON.stringify({ error: "メッセージを入力してください。" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const trimmedQuery = query.trim();
  if (trimmedQuery.length > env.MAX_MESSAGE_LENGTH) {
    return new Response(
      JSON.stringify({
        error: `メッセージが長すぎます（最大 ${env.MAX_MESSAGE_LENGTH} 文字）。`,
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
```

---

## 🔄 リトライ機能

### ブロッキングモード

- **最大リトライ回数**: `DIFY_MAX_RETRIES`（デフォルト: 3回）
- **リトライ条件**: ネットワークエラー、5xxエラー
- **リトライしない条件**: 4xxエラー（クライアントエラー）
- **バックオフ**: 指数バックオフ（1秒、2秒、3秒...）

### コード参照

```39:116:app/lib/dify/client.ts
  async sendMessage(request: DifyChatRequest): Promise<DifyChatResponse> {
    const maxRetries = env.DIFY_MAX_RETRIES;
    let lastError: Error | AppError | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(this.buildUrl(CHAT_MESSAGES_ENDPOINT), {
          method: "POST",
          headers: this.createHeaders(),
          body: JSON.stringify(request),
          signal: AbortSignal.timeout(env.DIFY_TIMEOUT),
        });

        const body = (await response.json()) as unknown;

        if (!response.ok) {
          const error = this.toAppError(
            this.isErrorResponse(body) ? body : undefined,
            response.status,
          );
          
          // 4xxエラー（クライアントエラー）はリトライしない
          if (response.status >= 400 && response.status < 500) {
            throw error;
          }
          
          // 5xxエラー（サーバーエラー）はリトライ可能
          lastError = error;
          if (attempt < maxRetries) {
            await this.delay(1000 * (attempt + 1)); // 指数バックオフ
            continue;
          }
          throw error;
        }

        if (!this.isChatResponse(body)) {
          throw new AppError(
            ErrorCode.DIFY_INVALID_RESPONSE,
            "Dify APIから想定外のレスポンス形式が返されました",
            502,
          );
        }

        return body;
      } catch (error) {
        if (error instanceof AppError) {
          // 4xxエラーはリトライしない
          if (error.statusCode >= 400 && error.statusCode < 500) {
            throw error;
          }
          
          lastError = error;
          if (attempt < maxRetries) {
            await this.delay(1000 * (attempt + 1)); // 指数バックオフ
            continue;
          }
          throw error;
        }

        // ネットワークエラーやタイムアウトはリトライ可能
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < maxRetries) {
          logger.debug(`[DifyClient] リトライ試行 ${attempt + 1}/${maxRetries}`, { error: lastError.message });
          await this.delay(1000 * (attempt + 1)); // 指数バックオフ
          continue;
        }
      }
    }

    // すべてのリトライが失敗した場合
    throw new AppError(
      ErrorCode.DIFY_CONNECTION_FAILED,
      `Dify APIとの通信に失敗しました（${maxRetries + 1}回試行）: ${
        lastError instanceof Error ? lastError.message : "Unknown error"
      }`,
      502,
    );
  }
```

---

## 📝 ログ出力

### デバッグログ

ストリーミングモードでは、リクエスト情報がログに記録されます：

```typescript
logger.debug("Dify API request", {
  url,
  method: "POST",
  headers: {
    ...headers,
    Authorization: headers.Authorization ? "Bearer ***" : undefined,
  },
  body: request,
});
```

### コード参照

```135:143:app/lib/dify/client.ts
    logger.debug("Dify API request", {
      url,
      method: "POST",
      headers: {
        ...headers,
        Authorization: headers.Authorization ? "Bearer ***" : undefined,
      },
      body: request,
    });
```

---

## 🔗 関連ファイル

- **型定義**: `app/types/dify.ts`
- **クライアント実装**: `app/lib/dify/client.ts`
- **ストリーミングAPI**: `app/routes/api.chat-stream.ts`
- **ブロッキングAPI**: `app/routes/chat.tsx`
- **環境変数**: `app/lib/utils/env.ts`
- **API仕様**: `docs/03_API仕様.md`

---

## 📊 送信情報のまとめ

| 項目 | 値 | 取得元 |
|------|-----|--------|
| `inputs.user_id` | ユーザーEmail | `session.userEmail` |
| `inputs.department_names` | 部署名（カンマ区切り） | `session.departmentNames.join(",")` |
| `query` | ユーザーの質問 | フォーム入力（トリム済み） |
| `response_mode` | `"streaming"` または `"blocking"` | 固定値 |
| `conversation_id` | 会話ID | フォームまたは空文字列 |
| `user` | ユーザー識別子 | `session.userEmail` |

---

**最終更新**: 2025年12月5日

