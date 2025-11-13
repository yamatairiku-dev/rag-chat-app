// app/lib/session/memory-storage.ts
import type { UserSession, SessionStorage } from '~/types/session';

class MemorySessionStorage implements SessionStorage {
  private sessions: Map<string, UserSession> = new Map();

  async get(sessionId: string): Promise<UserSession | null> {
    return this.sessions.get(sessionId) || null;
  }

  async set(sessionId: string, session: UserSession): Promise<void> {
    this.sessions.set(sessionId, session);
  }

  async delete(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
  }

  async exists(sessionId: string): Promise<boolean> {
    return this.sessions.has(sessionId);
  }
  
  // 定期的なクリーンアップ
  async cleanup(): Promise<void> {
    const now = Date.now();
    for (const [sessionId, session] of this.sessions.entries()) {
      // 24時間以上アクセスがないセッションを削除
      if (now - session.lastAccessedAt > 86400000) {
        this.sessions.delete(sessionId);
      }
    }
  }
}

export const memoryStorage = new MemorySessionStorage();

