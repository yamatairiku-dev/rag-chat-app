import { describe, expect, it, vi, beforeEach } from "vitest";
import { ensureValidToken } from "~/lib/session/token-refresh";
import { AppError, ErrorCode } from "~/types/error";
import type { UserSession } from "~/types/session";

// モック
vi.mock("~/lib/auth/entra-client", () => ({
  refreshAccessToken: vi.fn(),
}));

vi.mock("~/lib/session/memory-storage", () => ({
  memoryStorage: {
    set: vi.fn(),
    delete: vi.fn(),
  },
}));

import { refreshAccessToken } from "~/lib/auth/entra-client";
import { memoryStorage } from "~/lib/session/memory-storage";

describe("token-refresh", () => {
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
      tokenExpiresAt: now + 3600000, // 1時間後
      createdAt: now,
      lastAccessedAt: now,
      ...overrides,
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("ensureValidToken", () => {
    it("正常系: トークンが有効な場合はそのまま返す", async () => {
      const now = Date.now();
      const sessionId = "session-1";
      const session = createTestSession({
        tokenExpiresAt: now + 10 * 60 * 1000, // 10分後
      });

      const result = await ensureValidToken(sessionId, session);

      expect(result).toBe(session);
      expect(refreshAccessToken).not.toHaveBeenCalled();
      expect(memoryStorage.set).not.toHaveBeenCalled();
    });

    it("正常系: トークンが5分以内に期限切れの場合は更新する", async () => {
      const now = Date.now();
      const sessionId = "session-1";
      const session = createTestSession({
        tokenExpiresAt: now + 4 * 60 * 1000, // 4分後（5分のバッファ内）
        refreshToken: "refresh-token",
      });

      const newTokens = {
        accessToken: "new-access-token",
        refreshToken: "new-refresh-token",
        expiresIn: 3600,
      };

      vi.mocked(refreshAccessToken).mockResolvedValue(newTokens);

      const result = await ensureValidToken(sessionId, session);

      expect(refreshAccessToken).toHaveBeenCalledWith("refresh-token");
      expect(memoryStorage.set).toHaveBeenCalled();
      expect(result.accessToken).toBe("new-access-token");
      expect(result.refreshToken).toBe("new-refresh-token");
    });

    it("正常系: トークンが既に期限切れの場合は更新する", async () => {
      const now = Date.now();
      const sessionId = "session-1";
      const session = createTestSession({
        tokenExpiresAt: now - 1000, // 1秒前に期限切れ
        refreshToken: "refresh-token",
      });

      const newTokens = {
        accessToken: "new-access-token",
        refreshToken: "new-refresh-token",
        expiresIn: 3600,
      };

      vi.mocked(refreshAccessToken).mockResolvedValue(newTokens);

      const result = await ensureValidToken(sessionId, session);

      expect(refreshAccessToken).toHaveBeenCalledWith("refresh-token");
      expect(memoryStorage.set).toHaveBeenCalled();
      expect(result.accessToken).toBe("new-access-token");
    });

    it("正常系: リフレッシュトークンがない場合は新しいrefreshTokenを使用する", async () => {
      const now = Date.now();
      const sessionId = "session-1";
      const session = createTestSession({
        tokenExpiresAt: now + 4 * 60 * 1000,
        refreshToken: "old-refresh-token",
      });

      const newTokens = {
        accessToken: "new-access-token",
        refreshToken: undefined, // リフレッシュトークンが返されない場合
        expiresIn: 3600,
      };

      vi.mocked(refreshAccessToken).mockResolvedValue(newTokens);

      const result = await ensureValidToken(sessionId, session);

      expect(result.refreshToken).toBe("old-refresh-token"); // 既存のトークンを使用
    });

    it("異常系: リフレッシュトークンがない場合はAppErrorを投げる", async () => {
      const now = Date.now();
      const sessionId = "session-1";
      const session = createTestSession({
        tokenExpiresAt: now + 4 * 60 * 1000,
        refreshToken: undefined,
      });

      await expect(ensureValidToken(sessionId, session)).rejects.toThrow(AppError);
      await expect(ensureValidToken(sessionId, session)).rejects.toThrow(
        "リフレッシュトークンが利用できません"
      );
    });

    it("異常系: リフレッシュトークンが空文字列の場合はAppErrorを投げる", async () => {
      const now = Date.now();
      const sessionId = "session-1";
      const session = createTestSession({
        tokenExpiresAt: now + 4 * 60 * 1000,
        refreshToken: "",
      });

      await expect(ensureValidToken(sessionId, session)).rejects.toThrow(AppError);
    });

    it("異常系: リフレッシュトークンの更新に失敗した場合はセッションを削除する", async () => {
      const now = Date.now();
      const sessionId = "session-1";
      const session = createTestSession({
        tokenExpiresAt: now + 4 * 60 * 1000,
        refreshToken: "invalid-refresh-token",
      });

      const error = new AppError(
        ErrorCode.AUTH_TOKEN_EXPIRED,
        "リフレッシュトークンが無効です",
        401
      );

      vi.mocked(refreshAccessToken).mockRejectedValue(error);

      await expect(ensureValidToken(sessionId, session)).rejects.toThrow(AppError);
      expect(memoryStorage.delete).toHaveBeenCalledWith(sessionId);
    });

    it("異常系: リフレッシュトークンの更新で一般的なエラーが発生した場合はAppErrorを投げる", async () => {
      const now = Date.now();
      const sessionId = "session-1";
      const session = createTestSession({
        tokenExpiresAt: now + 4 * 60 * 1000,
        refreshToken: "refresh-token",
      });

      const error = new Error("Network error");
      vi.mocked(refreshAccessToken).mockRejectedValue(error);

      await expect(ensureValidToken(sessionId, session)).rejects.toThrow(AppError);
      await expect(ensureValidToken(sessionId, session)).rejects.toThrow(
        "トークンのリフレッシュに失敗しました"
      );
      expect(memoryStorage.delete).toHaveBeenCalledWith(sessionId);
    });

    it("正常系: 更新後のセッションのlastAccessedAtが更新される", async () => {
      const now = Date.now();
      const sessionId = "session-1";
      const oldLastAccessedAt = now - 10000; // 10秒前
      const session = createTestSession({
        tokenExpiresAt: now + 4 * 60 * 1000,
        refreshToken: "refresh-token",
        lastAccessedAt: oldLastAccessedAt,
      });

      const newTokens = {
        accessToken: "new-access-token",
        refreshToken: "new-refresh-token",
        expiresIn: 3600,
      };

      vi.mocked(refreshAccessToken).mockResolvedValue(newTokens);

      const result = await ensureValidToken(sessionId, session);

      expect(result.lastAccessedAt).toBeGreaterThan(oldLastAccessedAt);
    });
  });
});





