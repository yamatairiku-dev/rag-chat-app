import { describe, expect, it, vi, beforeEach } from "vitest";
import { AppError, ErrorCode } from "~/types/error";

// react-routerのjson関数をモック
vi.mock("react-router", () => ({
  json: vi.fn((data, init) => {
    const response = new Response(JSON.stringify(data), {
      status: init?.status || 200,
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });
    return response;
  }),
}));

// ロガーをモック
vi.mock("~/lib/logging/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

import { handleError } from "~/lib/errors/error-handler";
import { logger } from "~/lib/logging/logger";

describe("error-handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("handleError - エラーログ", () => {
    it("正常系: AppErrorの場合はエラーログを出力する", () => {
      const error = new AppError(
        ErrorCode.AUTH_TOKEN_EXPIRED,
        "トークンが期限切れです",
        401
      );

      handleError(error);

      expect(logger.error).toHaveBeenCalledWith("Application Error", expect.objectContaining({
        code: ErrorCode.AUTH_TOKEN_EXPIRED,
        message: "トークンが期限切れです",
        statusCode: 401,
      }));
    });

    it("正常系: 一般的なErrorの場合はエラーログを出力する", () => {
      const error = new Error("一般的なエラー");

      handleError(error);

      expect(logger.error).toHaveBeenCalledWith("Unexpected Error", expect.objectContaining({
        message: "一般的なエラー",
      }));
    });

    it("正常系: 不明な型のエラーの場合はエラーログを出力する", () => {
      const error = { custom: "error" };

      handleError(error);

      expect(logger.error).toHaveBeenCalledWith("Unknown Error", expect.objectContaining({
        error,
      }));
    });
  });

  describe("handleError - レスポンス生成", () => {
    it("正常系: AppErrorの場合は適切なレスポンスを返す", () => {
      const error = new AppError(
        ErrorCode.AUTH_TOKEN_EXPIRED,
        "トークンが期限切れです",
        401
      );

      const response = handleError(error);

      expect(response).toBeInstanceOf(Response);
      expect(response.status).toBe(401);
    });

    it("正常系: AppErrorのレスポンスにエラー情報が含まれる", async () => {
      const error = new AppError(
        ErrorCode.AUTH_TOKEN_EXPIRED,
        "トークンが期限切れです",
        401
      );

      const response = handleError(error);
      const data = await response.json();

      expect(data.error).toBeDefined();
      expect(data.error.message).toBe("トークンが期限切れです");
      expect(data.error.code).toBe(ErrorCode.AUTH_TOKEN_EXPIRED);
    });

    it("正常系: 一般的なErrorの場合は500エラーレスポンスを返す", () => {
      const error = new Error("一般的なエラー");

      const response = handleError(error);

      expect(response.status).toBe(500);
    });

    it("正常系: 一般的なErrorのレスポンスにエラー情報が含まれる", async () => {
      const error = new Error("一般的なエラー");

      const response = handleError(error);
      const data = await response.json();

      expect(data.error).toBeDefined();
      expect(data.error.code).toBe(ErrorCode.INTERNAL_SERVER_ERROR);
      expect(data.error.message).toBe("システムエラーが発生しました");
    });

    it("正常系: エラーレスポンスにContent-Typeヘッダーが設定される", async () => {
      const error = new AppError(
        ErrorCode.AUTH_TOKEN_EXPIRED,
        "トークンが期限切れです",
        401
      );

      const response = handleError(error);

      // react-routerのjson()関数は自動的にContent-Typeを設定する
      const contentType = response.headers.get("Content-Type");
      expect(contentType).toContain("application/json");
    });

    it("正常系: エラーレスポンスにタイムスタンプが含まれる", async () => {
      const error = new AppError(
        ErrorCode.DIFY_API_ERROR,
        "Dify APIエラー",
        503
      );

      const response = handleError(error);
      const data = await response.json();

      expect(data.timestamp).toBeDefined();
      expect(typeof data.timestamp).toBe("number");
    });

    it("正常系: 不明な型のエラーの場合は500エラーレスポンスを返す", async () => {
      const error = { custom: "error" };

      const response = handleError(error);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.code).toBe(ErrorCode.INTERNAL_SERVER_ERROR);
      expect(data.error.message).toBe("システムエラーが発生しました");
    });
  });
});

