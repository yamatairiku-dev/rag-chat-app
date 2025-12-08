import { describe, expect, it, beforeEach } from "vitest";
import { memoryStorage } from "~/lib/session/memory-storage";
import type { UserSession } from "~/types/session";

describe("memory-storage", () => {
  const createTestSession = (overrides?: Partial<UserSession>): UserSession => {
    const now = Date.now();
    return {
      userId: "user-123",
      userEmail: "test@example.com",
      displayName: "Test User",
      departmentCode: "001",
      departmentName: "テスト部署",
      accessToken: "test-access-token",
      refreshToken: "test-refresh-token",
      tokenExpiresAt: now + 3600000,
      createdAt: now,
      lastAccessedAt: now,
      ...overrides,
    };
  };

  beforeEach(async () => {
    // 各テスト前にストレージをクリア
    // 注意: memory-storageはシングルトンなので、直接クリアできない
    // 代わりに、既存のセッションを削除する
    const testSessionIds = ["session-1", "session-2", "session-3"];
    for (const sessionId of testSessionIds) {
      try {
        await memoryStorage.delete(sessionId);
      } catch {
        // セッションが存在しない場合は無視
      }
    }
  });

  describe("get", () => {
    it("正常系: セッションを取得できる", async () => {
      const sessionId = "session-1";
      const session = createTestSession();

      await memoryStorage.set(sessionId, session);
      const result = await memoryStorage.get(sessionId);

      expect(result).not.toBeNull();
      expect(result?.userId).toBe(session.userId);
      expect(result?.userEmail).toBe(session.userEmail);
      expect(result?.displayName).toBe(session.displayName);
    });

    it("異常系: 存在しないセッションIDの場合はnullを返す", async () => {
      const result = await memoryStorage.get("non-existent-session");

      expect(result).toBeNull();
    });
  });

  describe("set", () => {
    it("正常系: セッションを保存できる", async () => {
      const sessionId = "session-1";
      const session = createTestSession();

      await memoryStorage.set(sessionId, session);
      const result = await memoryStorage.get(sessionId);

      expect(result).not.toBeNull();
      expect(result?.userId).toBe(session.userId);
    });

    it("正常系: 既存のセッションを上書きできる", async () => {
      const sessionId = "session-1";
      const session1 = createTestSession({ userId: "user-1" });
      const session2 = createTestSession({ userId: "user-2" });

      await memoryStorage.set(sessionId, session1);
      await memoryStorage.set(sessionId, session2);
      const result = await memoryStorage.get(sessionId);

      expect(result?.userId).toBe("user-2");
    });
  });

  describe("delete", () => {
    it("正常系: セッションを削除できる", async () => {
      const sessionId = "session-1";
      const session = createTestSession();

      await memoryStorage.set(sessionId, session);
      await memoryStorage.delete(sessionId);
      const result = await memoryStorage.get(sessionId);

      expect(result).toBeNull();
    });

    it("正常系: 存在しないセッションを削除してもエラーが発生しない", async () => {
      await expect(memoryStorage.delete("non-existent-session")).resolves.not.toThrow();
    });
  });

  describe("exists", () => {
    it("正常系: 存在するセッションの場合はtrueを返す", async () => {
      const sessionId = "session-1";
      const session = createTestSession();

      await memoryStorage.set(sessionId, session);
      const result = await memoryStorage.exists(sessionId);

      expect(result).toBe(true);
    });

    it("正常系: 存在しないセッションの場合はfalseを返す", async () => {
      const result = await memoryStorage.exists("non-existent-session");

      expect(result).toBe(false);
    });
  });

  describe("cleanup", () => {
    it("正常系: 24時間以上アクセスがないセッションを削除する", async () => {
      const now = Date.now();
      const oldSessionId = "old-session";
      const newSessionId = "new-session";

      // 25時間前のセッション
      const oldSession = createTestSession({
        lastAccessedAt: now - 25 * 60 * 60 * 1000,
      });

      // 1時間前のセッション
      const newSession = createTestSession({
        lastAccessedAt: now - 60 * 60 * 1000,
      });

      await memoryStorage.set(oldSessionId, oldSession);
      await memoryStorage.set(newSessionId, newSession);

      await memoryStorage.cleanup();

      // 古いセッションは削除される
      expect(await memoryStorage.exists(oldSessionId)).toBe(false);
      // 新しいセッションは残る
      expect(await memoryStorage.exists(newSessionId)).toBe(true);
    });

    it("正常系: 24時間以内にアクセスがあったセッションは残る", async () => {
      const now = Date.now();
      const sessionId = "recent-session";

      // 23時間前のセッション
      const session = createTestSession({
        lastAccessedAt: now - 23 * 60 * 60 * 1000,
      });

      await memoryStorage.set(sessionId, session);
      await memoryStorage.cleanup();

      expect(await memoryStorage.exists(sessionId)).toBe(true);
    });

    it("正常系: セッションが存在しない場合はエラーが発生しない", async () => {
      await expect(memoryStorage.cleanup()).resolves.not.toThrow();
    });
  });
});





