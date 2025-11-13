# 実装ガイド Phase 4: 機能拡張

**所要時間**: 12-16時間  
**目的**: チャット履歴、設定画面、テストの実装

---

## 実装順序

1. チャット履歴機能 (3-4時間)
2. 設定画面 (2-3時間)
3. エラーハンドリング強化 (2時間)
4. テスト実装 (3-4時間)

---

## ステップ1: チャット履歴機能

### ファイル: `app/routes/_protected.conversations.tsx`

Dify APIから会話履歴を取得し、表示する機能を実装します。

```typescript
// app/routes/_protected.conversations.tsx
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router';
import { json, redirect } from 'react-router';
import { Form, useLoaderData, useActionData } from 'react-router';
import { requireUserSession } from '~/lib/session/session-manager';
import { DifyClient } from '~/lib/dify/dify-client';
import { env } from '~/lib/utils/env';
import type { ChatSession } from '~/types/chat';

// 会話一覧を取得
export async function loader({ request }: LoaderFunctionArgs) {
  const session = await requireUserSession(request);
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit') || '20');

  try {
    const client = new DifyClient(env.DIFY_API_URL, env.DIFY_API_KEY);
    
    // 注意: Dify APIに会話一覧取得エンドポイントがない場合、
    // ローカルストレージやサーバーサイドストレージから取得
    
    // 会話履歴を取得（実際の実装ではAPIから取得）
    const conversations: ChatSession[] = [];
    
    return json({
      conversations,
      user: session,
    });
  } catch (error) {
    console.error('会話履歴取得エラー:', error);
    return json({
      conversations: [],
      user: session,
      error: '会話履歴の取得に失敗しました',
    });
  }
}

// 特定の会話のメッセージを取得
export async function action({ request }: ActionFunctionArgs) {
  const session = await requireUserSession(request);
  const formData = await request.formData();
  const conversationId = formData.get('conversation_id') as string;
  const action = formData.get('action') as string;

  if (action === 'load') {
    try {
      const client = new DifyClient(env.DIFY_API_URL, env.DIFY_API_KEY);
      
      // Dify APIから会話メッセージを取得
      // 実際の実装では Dify API の GET /conversations/:id/messages を使用
      const response = await fetch(
        `${env.DIFY_API_URL}/conversations/${conversationId}/messages?user=${session.userEmail}&limit=50`,
        {
          headers: {
            'Authorization': `Bearer ${env.DIFY_API_KEY}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('会話メッセージの取得に失敗しました');
      }

      const data = await response.json();
      
      return json({
        success: true,
        messages: data.data || [],
        conversationId,
      });
    } catch (error) {
      return json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'エラーが発生しました',
        },
        { status: 500 }
      );
    }
  }

  if (action === 'delete') {
    try {
      const client = new DifyClient(env.DIFY_API_URL, env.DIFY_API_KEY);
      
      // Dify APIから会話を削除
      const response = await fetch(
        `${env.DIFY_API_URL}/conversations/${conversationId}?user=${session.userEmail}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${env.DIFY_API_KEY}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('会話の削除に失敗しました');
      }

      return json({ success: true });
    } catch (error) {
      return json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'エラーが発生しました',
        },
        { status: 500 }
      );
    }
  }

  return json({ success: false, error: '無効なアクション' }, { status: 400 });
}

export default function Conversations() {
  const { conversations, user } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  return (
    <div className="flex flex-col h-screen">
      <div className="border-b p-4">
        <h1 className="text-2xl font-bold">会話履歴</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {conversations.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <p>会話履歴がありません</p>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map((conv) => (
              <div
                key={conv.conversationId}
                className="border rounded p-4 hover:bg-gray-50 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium">{conv.title || 'タイトルなし'}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {new Date(conv.updatedAt).toLocaleString('ja-JP')}
                    </p>
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                      {conv.messages[conv.messages.length - 1]?.content || ''}
                    </p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Form method="post">
                      <input
                        type="hidden"
                        name="conversation_id"
                        value={conv.conversationId}
                      />
                      <input type="hidden" name="action" value="load" />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        開く
                      </button>
                    </Form>
                    <Form method="post">
                      <input
                        type="hidden"
                        name="conversation_id"
                        value={conv.conversationId}
                      />
                      <input type="hidden" name="action" value="delete" />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                        onClick={(e) => {
                          if (!confirm('この会話を削除しますか？')) {
                            e.preventDefault();
                          }
                        }}
                      >
                        削除
                      </button>
                    </Form>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {actionData?.error && (
        <div className="border-t p-4 bg-red-50 text-red-600">
          {actionData.error}
        </div>
      )}
    </div>
  );
}
```

---

## ステップ2: 設定画面

### ファイル: `app/routes/_protected.settings.tsx`

ユーザー情報の表示と設定変更機能を実装します。

```typescript
// app/routes/_protected.settings.tsx
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router';
import { json, redirect } from 'react-router';
import { Form, useLoaderData, useActionData } from 'react-router';
import { requireUserSession } from '~/lib/session/session-manager';
import { deleteSession } from '~/lib/session/session-manager';

// ユーザー情報を取得
export async function loader({ request }: LoaderFunctionArgs) {
  const session = await requireUserSession(request);
  
  return json({
    user: {
      displayName: session.displayName,
      userEmail: session.userEmail,
      departmentCode: session.departmentCode,
      departmentName: session.departmentName,
    },
  });
}

// 設定変更（将来実装）
export async function action({ request }: ActionFunctionArgs) {
  const session = await requireUserSession(request);
  const formData = await request.formData();
  const action = formData.get('action') as string;

  if (action === 'logout') {
    // ログアウト処理
    const clearCookie = await deleteSession(request);
    return redirect('/login', {
      headers: { 'Set-Cookie': clearCookie },
    });
  }

  return json({ success: false, error: '無効なアクション' }, { status: 400 });
}

export default function Settings() {
  const { user } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">設定</h1>

      <div className="space-y-6">
        {/* ユーザー情報セクション */}
        <section className="border rounded p-6">
          <h2 className="text-lg font-semibold mb-4">ユーザー情報</h2>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">表示名</dt>
              <dd className="mt-1 text-sm text-gray-900">{user.displayName}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">メールアドレス</dt>
              <dd className="mt-1 text-sm text-gray-900">{user.userEmail}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">所属コード</dt>
              <dd className="mt-1 text-sm text-gray-900">{user.departmentCode}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">所属部署</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {user.departmentName || '未設定'}
              </dd>
            </div>
          </dl>
        </section>

        {/* アカウントアクションセクション */}
        <section className="border rounded p-6">
          <h2 className="text-lg font-semibold mb-4">アカウント</h2>
          <div className="space-y-4">
            <Form method="post">
              <input type="hidden" name="action" value="logout" />
              <button
                type="submit"
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                ログアウト
              </button>
            </Form>
          </div>
        </section>

        {/* エラーメッセージ */}
        {actionData?.error && (
          <div className="border rounded p-4 bg-red-50 text-red-600">
            {actionData.error}
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## ステップ3: エラーハンドリング強化

### ファイル: `app/lib/errors/error-handler.ts`

[06_エラーハンドリング.md](./06_エラーハンドリング.md) を参照

エラーハンドラーを実装し、すべてのルートで使用します。

---

## ステップ4: テスト実装

### テスト環境セットアップ

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event
npm install -D @playwright/test playwright
npx playwright install
```

### ユニットテスト例

#### 環境変数バリデーションテスト

```typescript
// app/lib/utils/env.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { validateEnv } from './env';

describe('env validation', () => {
  beforeEach(() => {
    // 環境変数をリセット
    delete process.env.ENTRA_CLIENT_ID;
  });

  it('should validate required environment variables', () => {
    process.env.ENTRA_CLIENT_ID = 'invalid-uuid';
    
    expect(() => validateEnv()).toThrow();
  });

  it('should pass validation with valid environment variables', () => {
    process.env.ENTRA_CLIENT_ID = '12345678-1234-1234-1234-123456789012';
    // ... 他の必須環境変数を設定
    
    // expect(() => validateEnv()).not.toThrow();
  });
});
```

#### セッション管理テスト

```typescript
// app/lib/session/session-manager.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createSession, getSession, deleteSession } from './session-manager';
import type { Request } from '@react-router/node';

describe('session manager', () => {
  it('should create a session', async () => {
    const { cookie, sessionId } = await createSession({
      userId: 'user-123',
      userEmail: 'test@example.com',
      displayName: 'Test User',
      departmentCode: '001',
      accessToken: 'token-123',
      tokenExpiresAt: Date.now() + 3600000,
    });

    expect(cookie).toBeDefined();
    expect(sessionId).toBeDefined();
  });

  it('should get a session from request', async () => {
    const { cookie } = await createSession({
      userId: 'user-123',
      userEmail: 'test@example.com',
      displayName: 'Test User',
      departmentCode: '001',
      accessToken: 'token-123',
      tokenExpiresAt: Date.now() + 3600000,
    });

    const request = new Request('http://localhost', {
      headers: {
        Cookie: cookie.split(';')[0], // session=xxx のみ
      },
    });

    const session = await getSession(request);
    expect(session).toBeDefined();
    expect(session?.userId).toBe('user-123');
  });
});
```

#### Dify APIクライアントテスト

```typescript
// app/lib/dify/dify-client.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DifyClient } from './dify-client';

describe('DifyClient', () => {
  let client: DifyClient;

  beforeEach(() => {
    client = new DifyClient('https://api.dify.com', 'app-test-key');
  });

  it('should send a message', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        event: 'message',
        message_id: 'msg-123',
        conversation_id: 'conv-123',
        answer: 'Test answer',
      }),
    });

    const response = await client.sendMessage({
      inputs: {
        user_id: 'user@example.com',
        department_code: '001',
      },
      query: 'Test question',
      response_mode: 'blocking',
      user: 'user@example.com',
    });

    expect(response.answer).toBe('Test answer');
    expect(response.conversation_id).toBe('conv-123');
  });

  it('should handle API errors', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });

    await expect(
      client.sendMessage({
        inputs: {
          user_id: 'user@example.com',
          department_code: '001',
        },
        query: 'Test question',
        response_mode: 'blocking',
        user: 'user@example.com',
      })
    ).rejects.toThrow();
  });
});
```

### E2Eテスト例

#### ログインフローのテスト

```typescript
// tests/e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('認証フロー', () => {
  test('ログイン画面が表示される', async ({ page }) => {
    await page.goto('/login');
    
    await expect(page.locator('h1')).toContainText('社内RAG検索チャットボット');
    await expect(page.locator('button')).toContainText('Microsoftアカウントでログイン');
  });

  test('ログイン後、チャット画面にリダイレクトされる', async ({ page }) => {
    // 実際のテストでは、モックサーバーを使用するか、
    // テスト用の認証情報を使用する
    await page.goto('/login');
    
    // ログインボタンをクリック（実際の実装では認証フローをシミュレート）
    // await page.click('button');
    
    // 認証後、チャット画面にリダイレクトされることを確認
    // await expect(page).toHaveURL(/\/chat/);
  });
});
```

#### チャット機能のテスト

```typescript
// tests/e2e/chat.spec.ts
import { test, expect } from '@playwright/test';

test.describe('チャット機能', () => {
  test('メッセージを送信できる', async ({ page }) => {
    // ログイン状態をシミュレート（実際の実装では認証をモック）
    await page.goto('/chat');
    
    // メッセージ入力
    await page.fill('input[name="query"]', 'テストメッセージ');
    
    // 送信ボタンをクリック
    await page.click('button[type="submit"]');
    
    // メッセージが表示されることを確認
    await expect(page.locator('text=テストメッセージ')).toBeVisible();
  });

  test('ストリーミングレスポンスが表示される', async ({ page }) => {
    await page.goto('/chat');
    
    await page.fill('input[name="query"]', 'ストリーミングテスト');
    await page.click('button[type="submit"]');
    
    // ストリーミング中のインジケーターが表示されることを確認
    await expect(page.locator('text=送信中...')).toBeVisible();
    
    // 最終的に回答が表示されることを確認（タイムアウト設定が必要）
  });
});
```

### テスト実行

#### Vitest設定

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
  },
  resolve: {
    alias: {
      '~': path.resolve(__dirname, './app'),
    },
  },
});
```

#### Playwright設定

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

### テスト実行コマンド

```bash
# ユニットテスト実行
npm run test

# カバレッジ付きでテスト実行
npm run test:coverage

# E2Eテスト実行
npm run test:e2e

# UIモードでテスト実行（Vitest）
npm run test:ui

# UIモードでE2Eテスト実行（Playwright）
npm run test:e2e:ui
```

---

## Phase 4完了基準

- ✅ チャット履歴が表示される
- ✅ 会話を開いて再開できる
- ✅ 会話を削除できる
- ✅ 設定画面が動作する
- ✅ ユーザー情報が表示される
- ✅ ログアウトが動作する
- ✅ エラーハンドリングが適切に実装されている
- ✅ ユニットテストが通る
- ✅ E2Eテストが通る
- ✅ テストカバレッジが適切（80%以上推奨）

---

**最終ステップ**: [チェックリスト](./12_チェックリスト.md) で全体を確認
