# 実装ガイド Phase 1: 認証基盤

**所要時間**: 10-14時間  
**目的**: Microsoft Entra ID認証とGraph API連携の実装

---

## 実装順序

1. 型定義の作成 (1時間)
2. 環境変数バリデーション (1時間)
3. Entra IDクライアント (2-3時間)
4. Graph APIクライアント (1-2時間)
5. セッション管理 (2-3時間)
6. トークン自動更新機能 (1-2時間)
7. 認証ルート実装 (2-3時間)

---

## ステップ1: 型定義の作成

### ファイル: `app/types/error.ts`, `app/types/session.ts`

まず、エラー型とセッション型を定義します。これらの型は他のすべての実装で使用されます。

[07_型定義.md](./07_型定義.md) を参照

**重要**: 以下の型を最初に実装してください：
- `ErrorCode` enum
- `AppError` class
- `UserSession` interface
- `SessionStorage` interface

---

## ステップ2: 環境変数バリデーション

### ファイル: `app/lib/utils/env.ts`

[02_環境変数設定.md](./02_環境変数設定.md) を参照

---

## ステップ3: Entra IDクライアント

### ファイル: `app/lib/auth/entra-client.ts`

[04_認証設計.md](./04_認証設計.md) を参照

---

## ステップ4: Graph APIクライアント

### ファイル: `app/lib/graph/user-service.ts`

[04_認証設計.md](./04_認証設計.md) を参照

---

## ステップ5: セッション管理

### ファイル: `app/lib/session/session-manager.ts`

[05_セッション管理.md](./05_セッション管理.md) を参照

---

## ステップ6: トークン自動更新機能

### ファイル: `app/lib/session/token-refresh.ts`

トークンが期限切れになる前に自動的に更新する機能を実装します。

```typescript
// app/lib/session/token-refresh.ts
import { refreshAccessToken } from '~/lib/auth/entra-client';
import type { UserSession } from '~/types/session';
import { getSession } from './session-manager';
import { memoryStorage } from './memory-storage';
import { AppError, ErrorCode } from '~/types/error';

/**
 * トークン期限確認と自動更新
 */
export async function ensureValidToken(
  sessionId: string,
  session: UserSession
): Promise<UserSession> {
  const now = Date.now();
  const buffer = 5 * 60 * 1000; // 5分のバッファ
  
  // トークンが期限切れ、または5分以内に期限切れ
  if (now + buffer >= session.tokenExpiresAt) {
    if (!session.refreshToken) {
      throw new AppError(
        ErrorCode.AUTH_TOKEN_EXPIRED,
        'リフレッシュトークンが利用できません',
        401
      );
    }
    
    try {
      // リフレッシュトークンで新しいアクセストークンを取得
      const tokens = await refreshAccessToken(session.refreshToken);
      
      // セッションを更新
      const updatedSession: UserSession = {
        ...session,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiresAt: Date.now() + tokens.expiresIn * 1000,
        lastAccessedAt: Date.now(),
      };
      
      await memoryStorage.set(sessionId, updatedSession);
      
      return updatedSession;
    } catch (error) {
      // リフレッシュ失敗 → セッション削除
      await memoryStorage.delete(sessionId);
      throw new AppError(
        ErrorCode.AUTH_TOKEN_EXPIRED,
        'トークンの更新に失敗しました',
        401
      );
    }
  }
  
  return session;
}

/**
 * セッション取得時にトークンを自動更新
 */
export async function getSessionWithTokenRefresh(
  request: Request
): Promise<UserSession | null> {
  const session = await getSession(request);
  if (!session) {
    return null;
  }
  
  try {
    // セッションIDを取得（実際の実装ではcookieから取得）
    const cookies = request.headers.get('Cookie');
    // TODO: セッションIDの抽出ロジックを実装
    
    // トークンが有効か確認し、必要に応じて更新
    const refreshedSession = await ensureValidToken('sessionId', session);
    return refreshedSession;
  } catch (error) {
    // トークン更新失敗時はnullを返す（ログイン画面へリダイレクト）
    return null;
  }
}
```

**使用方法**:

```typescript
// app/routes/_protected.chat.tsx
import { getSessionWithTokenRefresh } from '~/lib/session/token-refresh';

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSessionWithTokenRefresh(request);
  if (!session) {
    return redirect('/login');
  }
  
  // 有効なセッションを使用
  return json({ user: session });
}
```

---

## ステップ7: 認証ルート実装

### ログイン画面

```typescript
// app/routes/_auth.login.tsx
import type { LoaderFunctionArgs } from 'react-router';
import { redirect, json } from 'react-router';
import { getAuthorizationUrl } from '~/lib/auth/entra-client';
import { getSession } from '~/lib/session/session-manager';

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request);
  if (session) {
    return redirect('/chat');
  }
  return json({ isLoggedIn: false });
}

export default function Login() {
  const handleLogin = () => {
    const authUrl = getAuthorizationUrl();
    window.location.href = authUrl;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <h1 className="text-2xl font-bold mb-6 text-center">
          社内RAG検索チャットボット
        </h1>
        <button
          onClick={handleLogin}
          className="w-full bg-blue-600 text-white py-3 rounded hover:bg-blue-700 transition"
        >
          Microsoftアカウントでログイン
        </button>
      </div>
    </div>
  );
}
```

### コールバック処理

```typescript
// app/routes/auth.tsx
import type { LoaderFunctionArgs } from 'react-router';
import { redirect, json } from 'react-router';
import { exchangeCodeForTokens } from '~/lib/auth/entra-client';
import { getUserInfo, getUserDepartment } from '~/lib/graph/user-service';
import { createSession } from '~/lib/session/session-manager';
import { AppError, ErrorCode } from '~/types/error';

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error) {
    return json({ error: `認証エラー: ${error}` }, { status: 400 });
  }

  if (!code) {
    return json({ error: '認証コードが見つかりません' }, { status: 400 });
  }

  try {
    // 1. トークン取得
    const tokens = await exchangeCodeForTokens(code);

    // 2. ユーザー情報取得
    const userInfo = await getUserInfo(tokens.accessToken);

    // 3. 所属部署取得
    const department = await getUserDepartment(tokens.accessToken);

    if (!department) {
      throw new AppError(
        ErrorCode.AUTH_DEPARTMENT_NOT_FOUND,
        'アクセス権限がありません',
        403
      );
    }

    // 4. セッション作成
    const { cookie } = await createSession({
      userId: userInfo.id,
      userEmail: userInfo.mail || userInfo.userPrincipalName,
      displayName: userInfo.displayName,
      departmentCode: department.code,
      departmentName: department.name,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenExpiresAt: Date.now() + tokens.expiresIn * 1000,
    });

    // 5. チャット画面へリダイレクト
    return redirect('/chat', {
      headers: { 'Set-Cookie': cookie },
    });
  } catch (error) {
    console.error('認証エラー:', error);
    return json(
      { error: error instanceof Error ? error.message : 'システムエラー' },
      { status: 500 }
    );
  }
}
```

### ログアウト

```typescript
// app/routes/_auth.logout.tsx
import type { ActionFunctionArgs } from 'react-router';
import { redirect } from 'react-router';
import { deleteSession } from '~/lib/session/session-manager';

export async function action({ request }: ActionFunctionArgs) {
  const clearCookie = await deleteSession(request);

  return redirect('/login', {
    headers: { 'Set-Cookie': clearCookie },
  });
}
```

---

## Phase 1完了基準

- ✅ ログイン画面が表示される
- ✅ Microsoftアカウントでログインできる
- ✅ ユーザー情報が取得できる
- ✅ 所属コードが取得できる
- ✅ セッションが保存される
- ✅ ログアウトが動作する
- ✅ トークンが自動更新される

---

**次のステップ**: [Phase 2: チャット機能](./09_実装ガイド_Phase2.md)
