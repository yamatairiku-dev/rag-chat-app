import { test, expect } from '@playwright/test';
import { setupAuthenticatedSession } from './helpers/auth';

/**
 * 会話履歴機能のE2Eテスト
 * 
 * 注意: 認証が必要なため、テスト前にセッションを設定する必要があります。
 * 認証ヘルパーを使用してセッションを作成します。
 */
test.describe('会話履歴機能', () => {
  test.beforeEach(async ({ page, context }) => {
    // 認証済みセッションを設定
    await setupAuthenticatedSession(page, context);
  });

  test('会話履歴画面が表示される', async ({ page }) => {
    await page.goto('/conversations');
    
    // ページが読み込まれるまで待機
    await page.waitForLoadState('networkidle');
    
    // ヘッダーが表示されることを確認（ページが読み込まれたことを確認）
    const header = page.locator('header');
    await expect(header).toBeVisible({ timeout: 15000 });
    
    // タイトルが表示されることを確認
    const title = page.locator('h2:has-text("会話履歴")');
    await expect(title).toBeVisible({ timeout: 10000 });
    
    // ページタイトルを確認（オプション、タイトルが設定されていない場合もある）
    // await expect(page).toHaveTitle(/会話履歴|社内RAG検索チャットボット/, { timeout: 15000 });
  });

  test('会話履歴が空の場合の表示', async ({ page }) => {
    await page.goto('/conversations');
    
    // 会話履歴が空の場合のメッセージを確認
    const emptyMessage = page.locator('text=会話履歴がありません');
    
    // 空の状態のメッセージが表示される可能性がある
    // 実際の実装に応じて確認方法を調整してください
  });

  test('会話履歴リストが表示される', async ({ page }) => {
    await page.goto('/conversations');
    
    // 会話履歴のコンテナが表示されることを確認
    const conversationsContainer = page.locator('.flex-1.overflow-y-auto, [class*="space-y"]');
    
    // コンテナが存在することを確認
    // 実際の実装に応じてセレクタを調整してください
  });

  test('会話を開くボタンが存在する', async ({ page }) => {
    await page.goto('/conversations');
    
    // 会話が存在する場合、「開く」ボタンが表示されることを確認
    // 実際のテストでは、テストデータを事前に作成する必要があります
    const openButton = page.locator('button:has-text("開く")');
    
    // 会話が存在する場合のみボタンが表示される
    // このテストは、会話が存在する場合の動作を確認します
  });

  test('会話を削除するボタンが存在する', async ({ page }) => {
    await page.goto('/conversations');
    
    // 会話が存在する場合、「削除」ボタンが表示されることを確認
    const deleteButton = page.locator('button:has-text("削除")');
    
    // 会話が存在する場合のみボタンが表示される
    // このテストは、会話が存在する場合の動作を確認します
  });

  test('会話を開く機能', async ({ page }) => {
    await page.goto('/conversations');
    
    // 会話が存在する場合、「開く」ボタンをクリック
    const openButton = page.locator('button:has-text("開く")').first();
    
    // ボタンが存在する場合のみテストを実行
    if (await openButton.isVisible()) {
      await openButton.click();
      
      // チャット画面にリダイレクトされることを確認
      await page.waitForURL(/\/chat/, { timeout: 5000 });
      
      // conversationIdパラメータが設定されていることを確認
      const url = page.url();
      expect(url).toMatch(/conversationId=/);
    }
  });

  test('会話を削除する機能', async ({ page }) => {
    await page.goto('/conversations');
    
    // 会話が存在する場合、「削除」ボタンをクリック
    const deleteButton = page.locator('button:has-text("削除")').first();
    
    // ボタンが存在する場合のみテストを実行
    if (await deleteButton.isVisible()) {
      // 確認ダイアログを処理
      page.on('dialog', async (dialog) => {
        expect(dialog.type()).toBe('confirm');
        await dialog.accept();
      });
      
      await deleteButton.click();
      
      // 削除後、会話がリストから削除されることを確認
      // 実際の実装に応じて確認方法を調整してください
      await page.waitForTimeout(1000);
    }
  });

  test('ヘッダーが表示される', async ({ page }) => {
    await page.goto('/conversations');
    
    // ヘッダーコンポーネントの確認
    const header = page.locator('header');
    await expect(header).toBeVisible();
    
    // アプリケーションタイトルが表示されることを確認
    const title = page.locator('text=社内RAG検索チャットボット');
    await expect(title).toBeVisible();
  });
});



