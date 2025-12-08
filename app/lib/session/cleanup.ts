// app/lib/session/cleanup.ts
import { memoryStorage } from './memory-storage';
import { logger } from '~/lib/logging/logger';

/**
 * 定期的なセッションクリーンアップ
 * 
 * 1時間ごとに期限切れセッションを削除します。
 * アプリケーション起動時に一度呼び出すことで、自動的にクリーンアップが開始されます。
 */
export function startSessionCleanup(): void {
  // 1時間ごとにクリーンアップ
  setInterval(async () => {
    try {
      await memoryStorage.cleanup();
      logger.info('[Session Cleanup] Expired sessions removed');
    } catch (error) {
      logger.error('[Session Cleanup] Failed to cleanup sessions', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  }, 3600000); // 1時間 (3600000ms)

  logger.info('[Session Cleanup] Session cleanup started (runs every hour)');
}




