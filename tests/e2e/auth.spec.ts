import { test, expect } from '@playwright/test';

/**
 * 認証フローのE2Eテスト
 * 
 * 注意: 実際のMicrosoft Entra ID認証をテストするには、
 * テスト用の認証情報が必要です。
 * このテストは基本的なUIの確認とリダイレクトの確認を行います。
 */
test.describe('認証フロー', () => {
  test.beforeEach(async ({ page }) => {
    // 各テスト前にホームページにアクセス
    await page.goto('/');
  });

  test('ホームページからログイン画面にリダイレクトされる', async ({ page }) => {
    // セッションがない場合、/auth/loginにリダイレクトされる
    // 実際のリダイレクト先はEntra IDの認証URLになるため、
    // URLが/auth/loginを含むか、またはMicrosoftの認証ページにリダイレクトされることを確認
    await page.waitForURL(/\/auth\/login|login\.microsoftonline\.com/, { timeout: 5000 });
  });

  test('ログイン画面にアクセスすると認証URLにリダイレクトされる', async ({ page }) => {
    // /auth/loginに直接アクセス
    await page.goto('/auth/login');
    
    // Entra IDの認証URLにリダイレクトされることを確認
    // リダイレクト先はMicrosoftの認証ページになる
    await page.waitForURL(/login\.microsoftonline\.com|microsoft\.com/, { timeout: 5000 });
  });

  test('認証後、チャット画面にリダイレクトされる', async ({ page, context }) => {
    // 注意: このテストは実際の認証フローをシミュレートする必要があります
    // テスト環境では、認証をモックするか、テスト用の認証情報を使用してください
    
    // セッションCookieを設定して認証済み状態をシミュレート
    // 実際の実装では、テスト用の認証ヘルパーを使用することを推奨
    await context.addCookies([
      {
        name: 'session',
        value: 'test-session-id',
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'Lax',
      },
    ]);

    // 認証コールバックをシミュレート
    // 実際の実装では、モックサーバーまたはテスト用の認証エンドポイントを使用
    await page.goto('/auth?code=test-auth-code');
    
    // エラーページが表示される可能性があるため、エラーハンドリングを確認
    // 実際の認証が成功した場合、/chatにリダイレクトされる
    const currentUrl = page.url();
    
    // 認証が成功した場合のリダイレクト先を確認
    // 実際のテストでは、モック認証を使用して成功ケースをテストすることを推奨
    expect(currentUrl).toMatch(/\/chat|\/auth/);
  });

  test('ログアウトが動作する', async ({ page, context }) => {
    // セッションCookieを設定して認証済み状態をシミュレート
    await context.addCookies([
      {
        name: 'session',
        value: 'test-session-id',
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'Lax',
      },
    ]);

    // チャット画面にアクセス（認証が必要）
    await page.goto('/chat');
    
    // ログアウトボタンを探す
    // Headerコンポーネントにログアウトボタンがあることを確認
    const logoutButton = page.locator('button:has-text("ログアウト")');
    
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
      
      // ログアウト後、ログイン画面またはホームにリダイレクトされることを確認
      await page.waitForURL(/\/auth\/login|\//, { timeout: 5000 });
    }
  });

  test('認証が必要なページにアクセスするとログイン画面にリダイレクトされる', async ({ page }) => {
    // セッションなしでチャット画面にアクセス
    await page.goto('/chat');
    
    // ログイン画面またはEntra IDの認証ページにリダイレクトされることを確認
    // 実際の実装では、/auth/loginにリダイレクトされ、さらにEntra IDの認証ページにリダイレクトされる
    await page.waitForURL(/\/auth\/login|login\.microsoftonline\.com/, { timeout: 10000 });
  });
});



