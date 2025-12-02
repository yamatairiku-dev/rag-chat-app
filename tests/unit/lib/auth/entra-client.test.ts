import { describe, expect, it, vi, beforeEach } from "vitest";
import { AppError, ErrorCode } from "~/types/error";

// MSALクライアントクラスをモック
vi.mock("@azure/msal-node", () => {
  const mockGetAuthCodeUrl = vi.fn();
  const mockAcquireTokenByCode = vi.fn();
  const mockAcquireTokenByRefreshToken = vi.fn();

  return {
    ConfidentialClientApplication: class {
      getAuthCodeUrl = mockGetAuthCodeUrl;
      acquireTokenByCode = mockAcquireTokenByCode;
      acquireTokenByRefreshToken = mockAcquireTokenByRefreshToken;
    },
    // モック関数をエクスポートしてテストで使用できるようにする
    __mockFunctions: {
      getAuthCodeUrl: mockGetAuthCodeUrl,
      acquireTokenByCode: mockAcquireTokenByCode,
      acquireTokenByRefreshToken: mockAcquireTokenByRefreshToken,
    },
  };
});

vi.mock("~/lib/utils/env", () => ({
  env: {
    ENTRA_CLIENT_ID: "test-client-id",
    ENTRA_TENANT_ID: "test-tenant-id",
    ENTRA_AUTHORITY: "https://login.microsoftonline.com",
    ENTRA_CLIENT_SECRET: "test-client-secret",
    ENTRA_REDIRECT_URI: "http://localhost:3000/auth",
  },
}));

import { getAuthorizationUrl, exchangeCodeForTokens, refreshAccessToken } from "~/lib/auth/entra-client";
import { ConfidentialClientApplication } from "@azure/msal-node";

// モック関数への参照を取得
const mockMsalClient = new ConfidentialClientApplication({} as any);
const mockGetAuthCodeUrl = (mockMsalClient as any).getAuthCodeUrl;
const mockAcquireTokenByCode = (mockMsalClient as any).acquireTokenByCode;
const mockAcquireTokenByRefreshToken = (mockMsalClient as any).acquireTokenByRefreshToken;

describe("entra-client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getAuthorizationUrl", () => {
    it("正常系: 認証URLを返す", async () => {
      const expectedUrl = "https://login.microsoftonline.com/test-tenant-id/oauth2/v2.0/authorize?client_id=test-client-id";
      mockGetAuthCodeUrl.mockResolvedValue(expectedUrl);

      const url = await getAuthorizationUrl();

      expect(url).toBe(expectedUrl);
      expect(mockGetAuthCodeUrl).toHaveBeenCalledWith({
        scopes: ["User.Read", "GroupMember.Read.All"],
        redirectUri: "http://localhost:3000/auth",
      });
    });

    it("異常系: MSALエラー時にAppErrorを投げる", async () => {
      const error = new Error("MSAL error");
      mockGetAuthCodeUrl.mockRejectedValue(error);

      await expect(getAuthorizationUrl()).rejects.toBeInstanceOf(AppError);
      await expect(getAuthorizationUrl()).rejects.toMatchObject({
        code: ErrorCode.AUTH_INVALID_TOKEN,
        statusCode: 500,
      });
    });
  });

  describe("exchangeCodeForTokens", () => {
    it("正常系: トークンを返す", async () => {
      const mockResponse = {
        accessToken: "test-access-token",
        idToken: "test-id-token",
        expiresOn: new Date(Date.now() + 3600000), // 1時間後
      };

      mockAcquireTokenByCode.mockResolvedValue(mockResponse);

      const result = await exchangeCodeForTokens("test-code");

      expect(result.accessToken).toBe("test-access-token");
      expect(result.idToken).toBe("test-id-token");
      expect(result.expiresIn).toBeGreaterThan(0);
      expect(mockAcquireTokenByCode).toHaveBeenCalledWith({
        code: "test-code",
        scopes: ["User.Read", "GroupMember.Read.All"],
        redirectUri: "http://localhost:3000/auth",
      });
    });

    it("異常系: トークンが取得できない場合にAppErrorを投げる", async () => {
      mockAcquireTokenByCode.mockResolvedValue(null);

      await expect(exchangeCodeForTokens("test-code")).rejects.toBeInstanceOf(AppError);
      await expect(exchangeCodeForTokens("test-code")).rejects.toMatchObject({
        code: ErrorCode.AUTH_INVALID_TOKEN,
        statusCode: 401,
      });
    });

    it("異常系: accessTokenが存在しない場合にAppErrorを投げる", async () => {
      mockAcquireTokenByCode.mockResolvedValue({
        idToken: "test-id-token",
        expiresOn: new Date(Date.now() + 3600000),
      });

      await expect(exchangeCodeForTokens("test-code")).rejects.toBeInstanceOf(AppError);
      await expect(exchangeCodeForTokens("test-code")).rejects.toMatchObject({
        code: ErrorCode.AUTH_INVALID_TOKEN,
        statusCode: 401,
      });
    });

    it("異常系: MSALエラー時にAppErrorを投げる", async () => {
      const error = new Error("MSAL error");
      mockAcquireTokenByCode.mockRejectedValue(error);

      await expect(exchangeCodeForTokens("test-code")).rejects.toBeInstanceOf(AppError);
      await expect(exchangeCodeForTokens("test-code")).rejects.toMatchObject({
        code: ErrorCode.AUTH_INVALID_TOKEN,
        statusCode: 401,
      });
    });
  });

  describe("refreshAccessToken", () => {
    it("正常系: リフレッシュトークンで新しいアクセストークンを取得", async () => {
      const mockResponse = {
        accessToken: "new-access-token",
        expiresOn: new Date(Date.now() + 3600000), // 1時間後
      };

      mockAcquireTokenByRefreshToken.mockResolvedValue(mockResponse);

      const result = await refreshAccessToken("test-refresh-token");

      expect(result.accessToken).toBe("new-access-token");
      expect(result.expiresIn).toBeGreaterThan(0);
      expect(mockAcquireTokenByRefreshToken).toHaveBeenCalledWith({
        refreshToken: "test-refresh-token",
        scopes: ["User.Read", "GroupMember.Read.All"],
      });
    });

    it("異常系: トークンが取得できない場合にAppErrorを投げる", async () => {
      mockAcquireTokenByRefreshToken.mockResolvedValue(null);

      await expect(refreshAccessToken("test-refresh-token")).rejects.toBeInstanceOf(AppError);
      await expect(refreshAccessToken("test-refresh-token")).rejects.toMatchObject({
        code: ErrorCode.AUTH_TOKEN_EXPIRED,
        statusCode: 401,
      });
    });

    it("異常系: accessTokenが存在しない場合にAppErrorを投げる", async () => {
      mockAcquireTokenByRefreshToken.mockResolvedValue({
        expiresOn: new Date(Date.now() + 3600000),
      });

      await expect(refreshAccessToken("test-refresh-token")).rejects.toBeInstanceOf(AppError);
      await expect(refreshAccessToken("test-refresh-token")).rejects.toMatchObject({
        code: ErrorCode.AUTH_TOKEN_EXPIRED,
        statusCode: 401,
      });
    });

    it("異常系: MSALエラー時にAppErrorを投げる", async () => {
      const error = new Error("MSAL error");
      mockAcquireTokenByRefreshToken.mockRejectedValue(error);

      await expect(refreshAccessToken("test-refresh-token")).rejects.toBeInstanceOf(AppError);
      await expect(refreshAccessToken("test-refresh-token")).rejects.toMatchObject({
        code: ErrorCode.AUTH_TOKEN_EXPIRED,
        statusCode: 401,
      });
    });
  });
});
