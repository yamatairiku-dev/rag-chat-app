import type { BrowserContext, Page } from '@playwright/test';

/**
 * E2Eテスト用の認証ヘルパー
 * 
 * テスト用の認証済みセッションを作成します。
 * テスト用のAPIエンドポイントを使用してセッションを作成し、
 * Cookieを設定します。
 */

/**
 * テスト用のユーザーセッションデータ
 */
export interface TestUserSession {
  userId?: string;
  userEmail?: string;
  displayName?: string;
  departmentCodes?: string[];
  departmentNames?: string[];
}

/**
 * デフォルトのテストユーザー
 */
const DEFAULT_TEST_USER: TestUserSession = {
  userId: 'test-user-123',
  userEmail: 'test@example.com',
  displayName: 'テストユーザー',
  departmentCodes: ['001'],
  departmentNames: ['テスト部署'],
};

/**
 * 認証済みセッションを設定
 * 
 * テスト用のAPIエンドポイントを使用してセッションを作成し、
 * Cookieを設定します。
 * 
 * @param page PlaywrightのPageオブジェクト
 * @param context PlaywrightのBrowserContext
 * @param user テストユーザー情報（省略時はデフォルトユーザー）
 * @returns 設定されたセッションID
 */
export async function setupAuthenticatedSession(
  page: Page,
  context: BrowserContext,
  user: TestUserSession = DEFAULT_TEST_USER
): Promise<string> {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

  // テスト用の認証APIエンドポイントを呼び出してセッションを作成
  const response = await page.request.post(`${baseURL}/api/test-auth`, {
    data: {
      userId: user.userId || DEFAULT_TEST_USER.userId,
      userEmail: user.userEmail || DEFAULT_TEST_USER.userEmail,
      displayName: user.displayName || DEFAULT_TEST_USER.displayName,
      departmentCodes: user.departmentCodes ?? DEFAULT_TEST_USER.departmentCodes,
      departmentNames: user.departmentNames ?? DEFAULT_TEST_USER.departmentNames,
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to create test session: ${response.status()} ${await response.text()}`);
  }

  const result = await response.json();
  
  // Set-CookieヘッダーからCookieを取得
  const setCookieHeader = response.headers()['set-cookie'];
  if (setCookieHeader) {
    // Set-Cookieヘッダーは配列の場合もあるので、文字列として処理
    const cookieString = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader;
    
    // Cookieを解析して設定
    // Set-Cookie形式: "session=xxx; Path=/; Max-Age=86400; HttpOnly=true; SameSite=Lax"
    const sessionMatch = cookieString.match(/session=([^;]+)/);
    
    if (sessionMatch && sessionMatch[1]) {
      const cookieValue = sessionMatch[1];
      
      // Cookieをコンテキストに追加
      await context.addCookies([
        {
          name: 'session',
          value: cookieValue,
          domain: 'localhost',
          path: '/',
          httpOnly: true,
          secure: false,
          sameSite: 'Lax',
        },
      ]);
    }
  }

  return result.sessionId || '';
}

/**
 * 認証済みセッションをクリア
 */
export async function clearAuthenticatedSession(context: BrowserContext): Promise<void> {
  await context.clearCookies();
}

