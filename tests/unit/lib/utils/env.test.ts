import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { z } from "zod";

// 環境変数をモック
const originalEnv = process.env;

describe("env", () => {
  beforeEach(() => {
    // 環境変数をリセット
    process.env = { ...originalEnv };
    // モジュールキャッシュをクリア
    vi.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("正常系: 必須環境変数が設定されている場合は成功", async () => {
    process.env = {
      NODE_ENV: "test",
      PORT: "3000",
      ENTRA_CLIENT_ID: "123e4567-e89b-12d3-a456-426614174000",
      ENTRA_CLIENT_SECRET: "test-secret",
      ENTRA_TENANT_ID: "123e4567-e89b-12d3-a456-426614174001",
      ENTRA_REDIRECT_URI: "http://localhost:3000/auth",
      ENTRA_POST_LOGOUT_REDIRECT_URI: "http://localhost:3000/login",
      DIFY_API_URL: "https://api.dify.ai",
      DIFY_API_KEY: "app-test-key",
      SESSION_SECRET: "test-session-secret-key-for-testing-purposes-only-32chars",
    };

    // モジュールを再インポート
    const { env } = await import("~/lib/utils/env");

    expect(env.NODE_ENV).toBe("test");
    expect(env.PORT).toBe(3000);
    expect(env.ENTRA_CLIENT_ID).toBe("123e4567-e89b-12d3-a456-426614174000");
  });

  it("正常系: デフォルト値が設定される", async () => {
    process.env = {
      NODE_ENV: "test",
      PORT: "3000",
      ENTRA_CLIENT_ID: "123e4567-e89b-12d3-a456-426614174000",
      ENTRA_CLIENT_SECRET: "test-secret",
      ENTRA_TENANT_ID: "123e4567-e89b-12d3-a456-426614174001",
      ENTRA_REDIRECT_URI: "http://localhost:3000/auth",
      ENTRA_POST_LOGOUT_REDIRECT_URI: "http://localhost:3000/login",
      DIFY_API_URL: "https://api.dify.ai",
      DIFY_API_KEY: "app-test-key",
      SESSION_SECRET: "test-session-secret-key-for-testing-purposes-only-32chars",
    };

    const { env } = await import("~/lib/utils/env");

    expect(env.ENTRA_AUTHORITY).toBe("https://login.microsoftonline.com");
    expect(env.GRAPH_API_URL).toBe("https://graph.microsoft.com/v1.0");
    expect(env.GRAPH_API_SCOPE).toBe("https://graph.microsoft.com/.default");
    expect(env.GRAPH_DEPARTMENT_GROUP_PREFIX).toBe("^ZA[A-Za-z]\\d{3}-[A-Za-z]");
    expect(env.DIFY_TIMEOUT).toBe(30000);
    expect(env.DIFY_MAX_RETRIES).toBe(3);
    expect(env.SESSION_MAX_AGE).toBe(86400000);
    expect(env.SESSION_RESET_HOUR).toBe(0);
    expect(env.SESSION_STORAGE).toBe("memory");
    expect(env.COOKIE_SECURE).toBe(true);
    expect(env.COOKIE_SAME_SITE).toBe("lax");
    expect(env.COOKIE_HTTP_ONLY).toBe(true);
    expect(env.LOG_LEVEL).toBe("info");
    expect(env.LOG_DIRECTORY).toBe("./logs");
    expect(env.LOG_MAX_FILES).toBe(30);
    expect(env.MAX_MESSAGE_LENGTH).toBe(2000);
    expect(env.RATE_LIMIT_WINDOW_MS).toBe(60000);
    expect(env.RATE_LIMIT_MAX_REQUESTS).toBe(30);
  });

  it("異常系: 必須環境変数が不足している場合はエラー", async () => {
    process.env = {
      NODE_ENV: "test",
      // PORTが不足
    };

    await expect(import("~/lib/utils/env")).rejects.toThrow();
  });

  it("異常系: 無効なUUID形式の場合はエラー", async () => {
    process.env = {
      NODE_ENV: "test",
      PORT: "3000",
      ENTRA_CLIENT_ID: "invalid-uuid",
      ENTRA_CLIENT_SECRET: "test-secret",
      ENTRA_TENANT_ID: "123e4567-e89b-12d3-a456-426614174001",
      ENTRA_REDIRECT_URI: "http://localhost:3000/auth",
      ENTRA_POST_LOGOUT_REDIRECT_URI: "http://localhost:3000/login",
      DIFY_API_URL: "https://api.dify.ai",
      DIFY_API_KEY: "app-test-key",
      SESSION_SECRET: "test-session-secret-key-for-testing-purposes-only-32chars",
    };

    await expect(import("~/lib/utils/env")).rejects.toThrow();
  });

  it("異常系: 無効なURL形式の場合はエラー", async () => {
    process.env = {
      NODE_ENV: "test",
      PORT: "3000",
      ENTRA_CLIENT_ID: "123e4567-e89b-12d3-a456-426614174000",
      ENTRA_CLIENT_SECRET: "test-secret",
      ENTRA_TENANT_ID: "123e4567-e89b-12d3-a456-426614174001",
      ENTRA_REDIRECT_URI: "invalid-url",
      ENTRA_POST_LOGOUT_REDIRECT_URI: "http://localhost:3000/login",
      DIFY_API_URL: "https://api.dify.ai",
      DIFY_API_KEY: "app-test-key",
      SESSION_SECRET: "test-session-secret-key-for-testing-purposes-only-32chars",
    };

    await expect(import("~/lib/utils/env")).rejects.toThrow();
  });

  it("異常系: Dify API Keyがapp-で始まらない場合はエラー", async () => {
    process.env = {
      NODE_ENV: "test",
      PORT: "3000",
      ENTRA_CLIENT_ID: "123e4567-e89b-12d3-a456-426614174000",
      ENTRA_CLIENT_SECRET: "test-secret",
      ENTRA_TENANT_ID: "123e4567-e89b-12d3-a456-426614174001",
      ENTRA_REDIRECT_URI: "http://localhost:3000/auth",
      ENTRA_POST_LOGOUT_REDIRECT_URI: "http://localhost:3000/login",
      DIFY_API_URL: "https://api.dify.ai",
      DIFY_API_KEY: "invalid-key",
      SESSION_SECRET: "test-session-secret-key-for-testing-purposes-only-32chars",
    };

    await expect(import("~/lib/utils/env")).rejects.toThrow();
  });

  it("異常系: SESSION_SECRETが32文字未満の場合はエラー", async () => {
    process.env = {
      NODE_ENV: "test",
      PORT: "3000",
      ENTRA_CLIENT_ID: "123e4567-e89b-12d3-a456-426614174000",
      ENTRA_CLIENT_SECRET: "test-secret",
      ENTRA_TENANT_ID: "123e4567-e89b-12d3-a456-426614174001",
      ENTRA_REDIRECT_URI: "http://localhost:3000/auth",
      ENTRA_POST_LOGOUT_REDIRECT_URI: "http://localhost:3000/login",
      DIFY_API_URL: "https://api.dify.ai",
      DIFY_API_KEY: "app-test-key",
      SESSION_SECRET: "short",
    };

    await expect(import("~/lib/utils/env")).rejects.toThrow();
  });

  it("異常系: GRAPH_DEPARTMENT_GROUP_PREFIXが無効な正規表現の場合はエラー", async () => {
    process.env = {
      NODE_ENV: "test",
      PORT: "3000",
      ENTRA_CLIENT_ID: "123e4567-e89b-12d3-a456-426614174000",
      ENTRA_CLIENT_SECRET: "test-secret",
      ENTRA_TENANT_ID: "123e4567-e89b-12d3-a456-426614174001",
      ENTRA_REDIRECT_URI: "http://localhost:3000/auth",
      ENTRA_POST_LOGOUT_REDIRECT_URI: "http://localhost:3000/login",
      DIFY_API_URL: "https://api.dify.ai",
      DIFY_API_KEY: "app-test-key",
      SESSION_SECRET: "test-session-secret-key-for-testing-purposes-only-32chars",
      GRAPH_DEPARTMENT_GROUP_PREFIX: "[", // 不正な正規表現（閉じ括弧なし）
    };

    await expect(import("~/lib/utils/env")).rejects.toThrow();
  });

  it("正常系: 数値変換が正しく動作する", async () => {
    process.env = {
      NODE_ENV: "test",
      PORT: "8080",
      ENTRA_CLIENT_ID: "123e4567-e89b-12d3-a456-426614174000",
      ENTRA_CLIENT_SECRET: "test-secret",
      ENTRA_TENANT_ID: "123e4567-e89b-12d3-a456-426614174001",
      ENTRA_REDIRECT_URI: "http://localhost:3000/auth",
      ENTRA_POST_LOGOUT_REDIRECT_URI: "http://localhost:3000/login",
      DIFY_API_URL: "https://api.dify.ai",
      DIFY_API_KEY: "app-test-key",
      DIFY_TIMEOUT: "60000",
      DIFY_MAX_RETRIES: "5",
      SESSION_SECRET: "test-session-secret-key-for-testing-purposes-only-32chars",
      SESSION_MAX_AGE: "172800000",
      SESSION_RESET_HOUR: "12",
      MAX_MESSAGE_LENGTH: "5000",
      RATE_LIMIT_WINDOW_MS: "120000",
      RATE_LIMIT_MAX_REQUESTS: "60",
    };

    const { env } = await import("~/lib/utils/env");

    expect(env.PORT).toBe(8080);
    expect(env.DIFY_TIMEOUT).toBe(60000);
    expect(env.DIFY_MAX_RETRIES).toBe(5);
    expect(env.SESSION_MAX_AGE).toBe(172800000);
    expect(env.SESSION_RESET_HOUR).toBe(12);
    expect(env.MAX_MESSAGE_LENGTH).toBe(5000);
    expect(env.RATE_LIMIT_WINDOW_MS).toBe(120000);
    expect(env.RATE_LIMIT_MAX_REQUESTS).toBe(60);
  });

  it("正常系: ブール値変換が正しく動作する", async () => {
    process.env = {
      NODE_ENV: "test",
      PORT: "3000",
      ENTRA_CLIENT_ID: "123e4567-e89b-12d3-a456-426614174000",
      ENTRA_CLIENT_SECRET: "test-secret",
      ENTRA_TENANT_ID: "123e4567-e89b-12d3-a456-426614174001",
      ENTRA_REDIRECT_URI: "http://localhost:3000/auth",
      ENTRA_POST_LOGOUT_REDIRECT_URI: "http://localhost:3000/login",
      DIFY_API_URL: "https://api.dify.ai",
      DIFY_API_KEY: "app-test-key",
      SESSION_SECRET: "test-session-secret-key-for-testing-purposes-only-32chars",
      COOKIE_SECURE: "false",
      COOKIE_HTTP_ONLY: "false",
    };

    const { env } = await import("~/lib/utils/env");

    expect(env.COOKIE_SECURE).toBe(false);
    expect(env.COOKIE_HTTP_ONLY).toBe(false);
  });

  it("正常系: COOKIE_DOMAINがオプショナル", async () => {
    process.env = {
      NODE_ENV: "test",
      PORT: "3000",
      ENTRA_CLIENT_ID: "123e4567-e89b-12d3-a456-426614174000",
      ENTRA_CLIENT_SECRET: "test-secret",
      ENTRA_TENANT_ID: "123e4567-e89b-12d3-a456-426614174001",
      ENTRA_REDIRECT_URI: "http://localhost:3000/auth",
      ENTRA_POST_LOGOUT_REDIRECT_URI: "http://localhost:3000/login",
      DIFY_API_URL: "https://api.dify.ai",
      DIFY_API_KEY: "app-test-key",
      SESSION_SECRET: "test-session-secret-key-for-testing-purposes-only-32chars",
    };

    const { env } = await import("~/lib/utils/env");

    expect(env.COOKIE_DOMAIN).toBeUndefined();
  });

  it("正常系: COOKIE_DOMAINが設定されている場合", async () => {
    process.env = {
      NODE_ENV: "test",
      PORT: "3000",
      ENTRA_CLIENT_ID: "123e4567-e89b-12d3-a456-426614174000",
      ENTRA_CLIENT_SECRET: "test-secret",
      ENTRA_TENANT_ID: "123e4567-e89b-12d3-a456-426614174001",
      ENTRA_REDIRECT_URI: "http://localhost:3000/auth",
      ENTRA_POST_LOGOUT_REDIRECT_URI: "http://localhost:3000/login",
      DIFY_API_URL: "https://api.dify.ai",
      DIFY_API_KEY: "app-test-key",
      SESSION_SECRET: "test-session-secret-key-for-testing-purposes-only-32chars",
      COOKIE_DOMAIN: "example.com",
    };

    const { env } = await import("~/lib/utils/env");

    expect(env.COOKIE_DOMAIN).toBe("example.com");
  });

  it("異常系: validateEnvがZodErrorを適切に処理する", async () => {
    process.env = {
      NODE_ENV: "test",
      PORT: "invalid",
      ENTRA_CLIENT_ID: "123e4567-e89b-12d3-a456-426614174000",
      ENTRA_CLIENT_SECRET: "test-secret",
      ENTRA_TENANT_ID: "123e4567-e89b-12d3-a456-426614174001",
      ENTRA_REDIRECT_URI: "http://localhost:3000/auth",
      ENTRA_POST_LOGOUT_REDIRECT_URI: "http://localhost:3000/login",
      DIFY_API_URL: "https://api.dify.ai",
      DIFY_API_KEY: "app-test-key",
      SESSION_SECRET: "test-session-secret-key-for-testing-purposes-only-32chars",
    };

    await expect(import("~/lib/utils/env")).rejects.toThrow(/環境変数の検証に失敗しました/);
  });
});





