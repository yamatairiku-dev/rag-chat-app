// app/lib/session/token-refresh.ts
import { refreshAccessToken } from '~/lib/auth/entra-client';
import type { UserSession } from '~/types/session';
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
        refreshToken: tokens.refreshToken || session.refreshToken,
        tokenExpiresAt: Date.now() + tokens.expiresIn * 1000,
        lastAccessedAt: Date.now(),
      };
      
      await memoryStorage.set(sessionId, updatedSession);
      
      return updatedSession;
    } catch (error) {
      // リフレッシュ失敗 → セッション削除
      await memoryStorage.delete(sessionId);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        ErrorCode.AUTH_TOKEN_EXPIRED,
        `トークンのリフレッシュに失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`,
        401
      );
    }
  }
  
  return session;
}

