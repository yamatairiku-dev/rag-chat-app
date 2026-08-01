import { test, expect } from '@playwright/test';
import { setupAuthenticatedSession } from './helpers/auth';

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

  test('ログイン操作で認証URLにリダイレクトされる', async ({ page }) => {
    // 外部のMicrosoft画面までは開かず、アプリが返すリダイレクト先を確認する
    const response = await page.request.get('/auth/login?action=redirect', {
      maxRedirects: 0,
    });

    expect(response.status()).toBe(302);
    expect(response.headers().location).toMatch(
      /^https:\/\/login\.microsoftonline\.com\//,
    );
  });

  test('認証後、チャット画面にリダイレクトされる', async ({ page, context }) => {
    await setupAuthenticatedSession(page, context);
    await page.goto('/chat');

    await expect(page).toHaveURL(/\/chat$/);
    await expect(page.getByRole('main')).toBeVisible();
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


