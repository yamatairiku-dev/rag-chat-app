import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { startSessionCleanup } from "~/lib/session/cleanup";
import { memoryStorage } from "~/lib/session/memory-storage";
import { logger } from "~/lib/logging/logger";
import type { UserSession } from "~/types/session";

// setIntervalをモック
vi.useFakeTimers();

describe("cleanup", () => {
  const createTestSession = (overrides?: Partial<UserSession>): UserSession => {
    const now = Date.now();
    return {
      userId: "user-123",
      userEmail: "test@example.com",
      displayName: "Test User",
      departmentCodes: ["001"],
      departmentNames: ["テスト部署"],
      accessToken: "test-access-token",
      refreshToken: "test-refresh-token",
      tokenExpiresAt: now + 3600000,
      createdAt: now,
      lastAccessedAt: now,
      ...overrides,
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.useFakeTimers();
  });

  describe("startSessionCleanup", () => {
    it("正常系: セッションクリーンアップが開始される", () => {
      const loggerInfoSpy = vi.spyOn(logger, "info");
      
      startSessionCleanup();

      expect(loggerInfoSpy).toHaveBeenCalledWith(
        "[Session Cleanup] Session cleanup started (runs every hour)"
      );
    });

    it("正常系: 1時間ごとにクリーンアップが実行される", async () => {
      const cleanupSpy = vi.spyOn(memoryStorage, "cleanup").mockResolvedValue();
      const loggerInfoSpy = vi.spyOn(logger, "info");

      startSessionCleanup();

      // 1時間経過
      await vi.advanceTimersByTimeAsync(3600000);

      expect(cleanupSpy).toHaveBeenCalledTimes(1);
      expect(loggerInfoSpy).toHaveBeenCalledWith(
        "[Session Cleanup] Expired sessions removed"
      );

      // さらに1時間経過
      await vi.advanceTimersByTimeAsync(3600000);

      expect(cleanupSpy).toHaveBeenCalledTimes(2);
    });

    it("正常系: クリーンアップが成功した場合はログに記録される", async () => {
      vi.spyOn(memoryStorage, "cleanup").mockResolvedValue();
      const loggerInfoSpy = vi.spyOn(logger, "info");

      startSessionCleanup();
      await vi.advanceTimersByTimeAsync(3600000);

      expect(loggerInfoSpy).toHaveBeenCalledWith(
        "[Session Cleanup] Expired sessions removed"
      );
    });

    it("異常系: クリーンアップが失敗した場合はエラーログに記録される", async () => {
      const error = new Error("Cleanup failed");
      vi.spyOn(memoryStorage, "cleanup").mockRejectedValue(error);
      const loggerErrorSpy = vi.spyOn(logger, "error");

      startSessionCleanup();
      await vi.advanceTimersByTimeAsync(3600000);

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        "[Session Cleanup] Failed to cleanup sessions",
        {
          error: "Cleanup failed",
          stack: error.stack,
        }
      );
    });

    it("異常系: 未知のエラーが発生した場合もエラーログに記録される", async () => {
      const unknownError = "Unknown error";
      vi.spyOn(memoryStorage, "cleanup").mockRejectedValue(unknownError);
      const loggerErrorSpy = vi.spyOn(logger, "error");

      startSessionCleanup();
      await vi.advanceTimersByTimeAsync(3600000);

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        "[Session Cleanup] Failed to cleanup sessions",
        {
          error: "Unknown error",
          stack: undefined,
        }
      );
    });

    it("正常系: 複数回のクリーンアップが連続して実行される", async () => {
      const cleanupSpy = vi.spyOn(memoryStorage, "cleanup").mockResolvedValue();

      startSessionCleanup();

      // 1時間経過
      await vi.advanceTimersByTimeAsync(3600000);
      expect(cleanupSpy).toHaveBeenCalledTimes(1);

      // さらに1時間経過
      await vi.advanceTimersByTimeAsync(3600000);
      expect(cleanupSpy).toHaveBeenCalledTimes(2);

      // さらに1時間経過
      await vi.advanceTimersByTimeAsync(3600000);
      expect(cleanupSpy).toHaveBeenCalledTimes(3);
    });
  });
});




