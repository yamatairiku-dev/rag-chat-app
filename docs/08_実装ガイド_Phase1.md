# 実装ガイド Phase 1: 認証基盤

**所要時間**: 8-12時間  
**目的**: Microsoft Entra ID認証とGraph API連携の実装

---

## 実装順序

1. 環境変数バリデーション (1時間)
2. Entra IDクライアント (2-3時間)
3. Graph APIクライアント (1-2時間)
4. セッション管理 (2-3時間)
5. 認証ルート実装 (2-3時間)

---

## ステップ1: 環境変数バリデーション

### ファイル: `app/lib/utils/env.ts`

[02_環境変数設定.md](./02_環境変数設定.md) を参照

---

## ステップ2: Entra IDクライアント

### ファイル: `app/lib/auth/entra-client.ts`

[04_認証設計.md](./04_認証設計.md) を参照

---

## ステップ3: Graph APIクライアント

### ファイル: `app/lib/graph/user-service.ts`

[04_認証設計.md](./04_認証設計.md) を参照

---

## ステップ4: セッション管理

### ファイル: `app/lib/session/session-manager.ts`

[05_セッション管理.md](./05_セッション管理.md) を参照

---

## ステップ5: 認証ルート実装

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
// app/routes/_auth.callback.tsx
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

---

**次のステップ**: [Phase 2: チャット機能](./09_実装ガイド_Phase2.md)
