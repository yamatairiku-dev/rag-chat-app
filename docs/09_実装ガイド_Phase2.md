# 実装ガイド Phase 2: チャット機能

**所要時間**: 6-8時間  
**目的**: Dify API連携とチャット機能の実装

---

## 実装順序

1. 型定義 (1時間)
2. Dify APIクライアント (2-3時間)
3. チャット画面 (2-3時間)
4. ストリーミング対応 (2時間)

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
    const response = await fetch(`${this.baseUrl}/v1/chat-messages`, {
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
    const response = await fetch(`${this.baseUrl}/v1/chat-messages`, {
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
  const [messages, setMessages] = useState<Array<any>>([]);
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();

  const isSubmitting = navigation.state === 'submitting';

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
        <Form method="post">
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

---

## Phase 2完了基準

- ✅ チャット画面が表示される
- ✅ メッセージが送信できる
- ✅ Dify APIから回答を取得できる
- ✅ ストリーミングレスポンスが動作する

---

**次のステップ**: [Phase 3: UI/UX改善](./10_実装ガイド_Phase3.md)
