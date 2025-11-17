# 実装ガイド Phase 2: チャット機能

**所要時間**: 8-12時間  
**目的**: Dify API連携とチャット機能の実装

---

## 実装順序

1. 型定義 (1時間)
2. Dify APIクライアント (2-3時間)
3. チャット画面（ブロッキングモード） (2-3時間)
4. ストリーミング対応チャット画面 (2-3時間)
5. 会話履歴管理 (1-2時間)

---

## ストリーミングAPIと会話保存の実装メモ

- SSEエンドポイントは `app/routes/api.chat-stream.ts` に定義します。認証セッションの検証後、`DifyClient.streamMessage` のイベントを `text/event-stream` としてフロントエンドへ送信します。
- 受信した会話は `app/lib/chat/conversation-store.server.ts` のインメモリストアに蓄積します。将来的にDBへ差し替えられるよう、会話ID・ユーザーID・部署コードを保存します。
- フロントエンド (`app/routes/chat.tsx`) は `/api/chat-stream` にPOSTし、受信した`data:`イベントを逐次描画します。`conversation_id` が返却されたタイミングでクライアント側のセッションストレージも更新してください。

---

## ステップ1: 型定義

### ファイル: `app/types/dify.ts`, `app/types/chat.ts`

[07_型定義.md](./07_型定義.md) を参照

---

## ステップ2: Dify APIクライアント

```typescript
// app/lib/dify/dify-client.ts
import type { 
  DifyChatRequest, 
  DifyChatResponse,
  DifyStreamRequest 
} from '~/types/dify';
import { env } from '~/lib/utils/env';

export class DifyClient {
  constructor(
    private baseUrl: string,
    private apiKey: string
  ) {}

  async sendMessage(request: DifyChatRequest): Promise<DifyChatResponse> {
    const response = await fetch(`${this.baseUrl}/chat-messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(env.DIFY_TIMEOUT),
    });

    if (!response.ok) {
      throw new Error(`Dify API error: ${response.status}`);
    }

    return response.json();
  }

  async *streamMessage(request: DifyStreamRequest): AsyncGenerator<any> {
    const response = await fetch(`${this.baseUrl}/chat-messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.body) {
      throw new Error('No response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));
          yield data;
        }
      }
    }
  }
}
```

---

## ステップ3: チャット画面

```typescript
// app/routes/_protected.chat.tsx
import { useState } from 'react';
import { Form, useActionData, useNavigation } from 'react-router';
import type { ActionFunctionArgs } from 'react-router';
import { json } from 'react-router';
import { requireUserSession } from '~/lib/session/session-manager';
import { DifyClient } from '~/lib/dify/dify-client';
import { env } from '~/lib/utils/env';

export async function action({ request }: ActionFunctionArgs) {
  const session = await requireUserSession(request);
  const formData = await request.formData();
  const query = formData.get('query') as string;

  if (!query?.trim()) {
    return json({ error: 'メッセージを入力してください' }, { status: 400 });
  }

  try {
    const client = new DifyClient(env.DIFY_API_URL, env.DIFY_API_KEY);
    const response = await client.sendMessage({
      inputs: {
        user_id: session.userEmail,
        department_code: session.departmentCode,
      },
      query: query.trim(),
      response_mode: 'blocking',
      conversation_id: '',
      user: session.userEmail,
    });

    return json({
      success: true,
      answer: response.answer,
      conversationId: response.conversation_id,
    });
  } catch (error) {
    return json(
      { error: 'メッセージ送信に失敗しました' },
      { status: 500 }
    );
  }
}

export default function Chat() {
  const [messages, setMessages] = useState<Array<{
    role: 'user' | 'assistant';
    content: string;
    id?: string;
  }>>([]);
  const [conversationId, setConversationId] = useState<string>('');
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();

  const isSubmitting = navigation.state === 'submitting';

  // actionDataからメッセージを追加
  useEffect(() => {
    if (actionData?.success && actionData.answer) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: actionData.answer,
          id: actionData.messageId,
        },
      ]);
      if (actionData.conversationId) {
        setConversationId(actionData.conversationId);
      }
    }
  }, [actionData]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const formData = new FormData(e.currentTarget);
    const query = formData.get('query') as string;
    
    if (query.trim()) {
      // ユーザーメッセージを追加
      setMessages(prev => [
        ...prev,
        { role: 'user', content: query.trim() },
      ]);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((msg, i) => (
          <div key={i} className={`mb-4 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
            <div className={`inline-block p-3 rounded ${msg.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}>
              {msg.content}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t p-4">
        <Form method="post" onSubmit={handleSubmit}>
          <input type="hidden" name="conversation_id" value={conversationId} />
          <div className="flex gap-2">
            <input
              type="text"
              name="query"
              className="flex-1 border rounded px-4 py-2"
              placeholder="メッセージを入力..."
              disabled={isSubmitting}
            />
            <button
              type="submit"
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              disabled={isSubmitting}
            >
              送信
            </button>
          </div>
        </Form>
      </div>
    </div>
  );
}
```

**注意**: 上記の実装では`useEffect`のインポートが必要です：

```typescript
import { useState, useEffect } from 'react';
```

また、action関数で会話IDを保持するように修正：

```typescript
const formData = await request.formData();
const query = formData.get('query') as string;
const existingConversationId = formData.get('conversation_id') as string || '';

// ... Dify API呼び出し時 ...
conversation_id: existingConversationId || '',
```

---

## ステップ4: ストリーミング対応チャット画面

ストリーミングモードでのチャット画面を実装します。

### ファイル: `app/routes/_protected.chat-stream.tsx`

```typescript
// app/routes/_protected.chat-stream.tsx
import { useState, useEffect, useRef } from 'react';
import { Form, useFetcher } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';
import { json, redirect } from 'react-router';
import { requireUserSession } from '~/lib/session/session-manager';
import { DifyClient } from '~/lib/dify/dify-client';
import { env } from '~/lib/utils/env';
import type { Message } from '~/types/chat';

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await requireUserSession(request);
  return json({ user: session });
}

export default function ChatStream() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string>('');
  const [currentMessage, setCurrentMessage] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);
  const fetcher = useFetcher();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // スクロールを最下部に移動
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentMessage]);

  // ストリーミング開始
  const handleStreamMessage = async (query: string) => {
    if (!query.trim() || isStreaming) return;

    // ユーザーメッセージを追加
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      conversationId: conversationId || `conv-${Date.now()}`,
      role: 'user',
      content: query.trim(),
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userMessage]);

    // アシスタントメッセージを準備
    const assistantMessageId = `assistant-${Date.now()}`;
    const assistantMessage: Message = {
      id: assistantMessageId,
      conversationId: userMessage.conversationId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
      isComplete: false,
    };
    setMessages(prev => [...prev, assistantMessage]);
    setIsStreaming(true);
    setCurrentMessage('');

    try {
      const client = new DifyClient(env.DIFY_API_URL, env.DIFY_API_KEY);
      
      // セッション情報を取得（実際の実装ではloaderから取得）
      const session = await fetcher.load('/api/session');
      
      let accumulatedAnswer = '';
      
      // ストリーミング開始
      for await (const event of client.streamMessage({
        inputs: {
          user_id: session.userEmail,
          department_code: session.departmentCode,
        },
        query: query.trim(),
        response_mode: 'streaming',
        conversation_id: conversationId || '',
        user: session.userEmail,
      })) {
        if (event.event === 'message') {
          // メッセージチャンクを追加
          accumulatedAnswer += event.answer;
          setCurrentMessage(accumulatedAnswer);
          
          // メッセージリストを更新
          setMessages(prev =>
            prev.map(msg =>
              msg.id === assistantMessageId
                ? {
                    ...msg,
                    content: accumulatedAnswer,
                    isStreaming: true,
                  }
                : msg
            )
          );

          // 会話IDを更新
          if (event.conversation_id) {
            setConversationId(event.conversation_id);
          }
        } else if (event.event === 'message_end') {
          // ストリーミング完了
          setMessages(prev =>
            prev.map(msg =>
              msg.id === assistantMessageId
                ? {
                    ...msg,
                    content: accumulatedAnswer,
                    isStreaming: false,
                    isComplete: true,
                  }
                : msg
            )
          );
          setIsStreaming(false);
        } else if (event.event === 'error') {
          // エラー処理
          setMessages(prev =>
            prev.map(msg =>
              msg.id === assistantMessageId
                ? {
                    ...msg,
                    content: accumulatedAnswer || 'エラーが発生しました',
                    isStreaming: false,
                    isComplete: true,
                    error: event.message,
                  }
                : msg
            )
          );
          setIsStreaming(false);
        }
      }
    } catch (error) {
      // エラー処理
      setMessages(prev =>
        prev.map(msg =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                content: 'エラーが発生しました',
                isStreaming: false,
                isComplete: true,
                error: error instanceof Error ? error.message : 'Unknown error',
              }
            : msg
        )
      );
      setIsStreaming(false);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const query = formData.get('query') as string;
    
    if (query?.trim()) {
      handleStreamMessage(query);
      e.currentTarget.reset();
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`mb-4 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}
          >
            <div
              className={`inline-block p-3 rounded max-w-3xl ${
                msg.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200'
              }`}
            >
              {msg.role === 'assistant' && msg.isStreaming ? (
                <>
                  {currentMessage || msg.content}
                  <span className="animate-pulse">▋</span>
                </>
              ) : (
                msg.content
              )}
              {msg.error && (
                <div className="mt-2 text-sm text-red-600">{msg.error}</div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t p-4">
        <Form method="post" onSubmit={handleSubmit}>
          <div className="flex gap-2">
            <input
              type="text"
              name="query"
              className="flex-1 border rounded px-4 py-2"
              placeholder="メッセージを入力..."
              disabled={isStreaming}
            />
            <button
              type="submit"
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              disabled={isStreaming}
            >
              {isStreaming ? '送信中...' : '送信'}
            </button>
          </div>
        </Form>
      </div>
    </div>
  );
}
```

**注意**: 上記の実装では以下のインポートが必要です：

```typescript
import { useState, useEffect, useRef } from 'react';
import { useFetcher } from 'react-router';
```

---

## ステップ5: 会話履歴管理

会話IDを保持し、会話の継続性を実現します。

### 会話IDの保存

会話IDをセッションストレージまたはローカルストレージに保存：

```typescript
// app/lib/chat/conversation-manager.ts
export class ConversationManager {
  private static STORAGE_KEY = 'rag-chat-conversation-id';

  static getConversationId(): string | null {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem(this.STORAGE_KEY);
  }

  static setConversationId(conversationId: string): void {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem(this.STORAGE_KEY, conversationId);
  }

  static clearConversationId(): void {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem(this.STORAGE_KEY);
  }

  static startNewConversation(): void {
    this.clearConversationId();
  }
}
```

**使用方法**:

```typescript
import { ConversationManager } from '~/lib/chat/conversation-manager';

// 新しい会話を開始
ConversationManager.startNewConversation();

// 会話IDを取得
const conversationId = ConversationManager.getConversationId();

// 会話IDを保存
ConversationManager.setConversationId(response.conversation_id);
```

---

## Phase 2完了基準

- ✅ チャット画面が表示される
- ✅ メッセージが送信できる
- ✅ Dify APIから回答を取得できる
- ✅ ストリーミングレスポンスが動作する
- ✅ リアルタイムで回答が表示される
- ✅ 会話IDが保持される
- ✅ 会話の継続性が実現される

---

**次のステップ**: [Phase 3: UI/UX改善](./10_実装ガイド_Phase3.md)
