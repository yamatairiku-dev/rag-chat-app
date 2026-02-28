import { describe, expect, it, beforeEach, vi } from "vitest";
import type { UserSession } from "~/types/session";
import { AppError, ErrorCode } from "~/types/error";

// モック
vi.mock("~/lib/session/session-manager", () => ({
  getSessionWithId: vi.fn(),
  requireUserSession: vi.fn(),
}));

vi.mock("~/lib/session/token-refresh", () => ({
  ensureValidToken: vi.fn(),
}));

vi.mock("~/lib/chat/conversation-store.server", () => ({
  getConversation: vi.fn(),
}));

vi.mock("~/lib/logging/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("~/lib/utils/env", () => ({
  env: {
    PORT: "3000",
    ENTRA_CLIENT_ID: "test-client-id",
    ENTRA_CLIENT_SECRET: "test-client-secret",
    ENTRA_TENANT_ID: "test-tenant-id",
    ENTRA_REDIRECT_URI: "http://localhost:3000/auth",
    ENTRA_POST_LOGOUT_REDIRECT_URI: "http://localhost:3000",
    DIFY_API_URL: "http://localhost/v1",
    DIFY_API_KEY: "test-api-key",
    SESSION_SECRET: "test-session-secret-key-for-testing-purposes-only",
    SESSION_MAX_AGE: 86400000,
    COOKIE_HTTP_ONLY: "true",
    COOKIE_SAME_SITE: "lax",
    COOKIE_SECURE: "false",
    COOKIE_DOMAIN: undefined,
    LOG_LEVEL: "info",
  },
}));

import { loader } from "~/routes/chat";
import { getSessionWithId } from "~/lib/session/session-manager";
import { ensureValidToken } from "~/lib/session/token-refresh";
import { getConversation } from "~/lib/chat/conversation-store.server";

const getSessionWithIdMock = vi.mocked(getSessionWithId);
const ensureValidTokenMock = vi.mocked(ensureValidToken);
const getConversationMock = vi.mocked(getConversation);

const baseSession: UserSession = {
  userId: "user-123",
  userEmail: "test@example.com",
  displayName: "テストユーザー",
  departmentCodes: ["001"],
  departmentNames: ["テスト部署"],
  accessToken: "test-access-token",
  refreshToken: "test-refresh-token",
  tokenExpiresAt: Date.now() + 3600000,
  createdAt: Date.now(),
  lastAccessedAt: Date.now(),
};

function createRequest(url: string = "http://localhost/chat") {
  return new Request(url);
}

describe("chat route loader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("正常系: セッションが存在する場合はユーザー情報を返す", async () => {
    getSessionWithIdMock.mockResolvedValue({
      session: baseSession,
      sessionId: "session-1",
    });
    ensureValidTokenMock.mockResolvedValue(baseSession);

    const request = createRequest();
    const response = await loader({ request } as never);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.user).toMatchObject({
      displayName: baseSession.displayName,
      userEmail: baseSession.userEmail,
      departmentCodes: baseSession.departmentCodes,
      departmentNames: baseSession.departmentNames,
    });
  });

  it("異常系: セッションが存在しない場合はリダイレクトする", async () => {
    getSessionWithIdMock.mockResolvedValue(null);

    const request = createRequest();
    const response = await loader({ request } as never);

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/auth/login");
  });

  it("異常系: トークンが期限切れの場合はリダイレクトする", async () => {
    getSessionWithIdMock.mockResolvedValue({
      session: baseSession,
      sessionId: "session-1",
    });

    const error = new AppError(
      ErrorCode.AUTH_TOKEN_EXPIRED,
      "トークンが期限切れです",
      401
    );
    ensureValidTokenMock.mockRejectedValue(error);

    const request = createRequest();
    const response = await loader({ request } as never);

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/auth/login");
  });

  it("正常系: conversationIdパラメータがある場合は会話を取得する", async () => {
    getSessionWithIdMock.mockResolvedValue({
      session: baseSession,
      sessionId: "session-1",
    });
    ensureValidTokenMock.mockResolvedValue(baseSession);

    const conversation = {
      conversationId: "conv-1",
      userId: "user-123",
      departmentCodes: ["001"],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [
        {
          id: "msg-1",
          role: "user" as const,
          content: "テストメッセージ",
          timestamp: Date.now(),
        },
        {
          id: "msg-2",
          role: "assistant" as const,
          content: "返信メッセージ",
          timestamp: Date.now(),
        },
      ],
    };

    getConversationMock.mockResolvedValue(conversation);

    const request = createRequest("http://localhost/chat?conversationId=conv-1");
    const response = await loader({ request } as never);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.conversationId).toBe("conv-1");
    expect(data.initialMessages).toBeDefined();
    expect(data.initialMessages).toHaveLength(2);
    expect(getConversationMock).toHaveBeenCalledWith("conv-1");
  });

  it("正常系: 他のユーザーの会話は取得しない", async () => {
    getSessionWithIdMock.mockResolvedValue({
      session: baseSession,
      sessionId: "session-1",
    });
    ensureValidTokenMock.mockResolvedValue(baseSession);

    const conversation = {
      conversationId: "conv-1",
      userId: "other-user",
      departmentCodes: ["001"],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
    };

    getConversationMock.mockResolvedValue(conversation);

    const request = createRequest("http://localhost/chat?conversationId=conv-1");
    const response = await loader({ request } as never);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.initialMessages).toBeUndefined();
  });

  it("正常系: 会話が見つからない場合はinitialMessagesがundefined", async () => {
    getSessionWithIdMock.mockResolvedValue({
      session: baseSession,
      sessionId: "session-1",
    });
    ensureValidTokenMock.mockResolvedValue(baseSession);
    getConversationMock.mockResolvedValue(null);

    const request = createRequest("http://localhost/chat?conversationId=non-existent");
    const response = await loader({ request } as never);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.initialMessages).toBeUndefined();
  });

  it("正常系: conversationIdパラメータがない場合はinitialMessagesがundefined", async () => {
    getSessionWithIdMock.mockResolvedValue({
      session: baseSession,
      sessionId: "session-1",
    });
    ensureValidTokenMock.mockResolvedValue(baseSession);

    const request = createRequest();
    const response = await loader({ request } as never);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.conversationId).toBeUndefined();
    expect(data.initialMessages).toBeUndefined();
  });

  it("異常系: 予期しないエラーが発生した場合はリダイレクトする", async () => {
    getSessionWithIdMock.mockRejectedValue(new Error("予期しないエラー"));

    const request = createRequest();
    const response = await loader({ request } as never);

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/auth/login");
  });

  it("正常系: 会話のメッセージが正しく変換される", async () => {
    getSessionWithIdMock.mockResolvedValue({
      session: baseSession,
      sessionId: "session-1",
    });
    ensureValidTokenMock.mockResolvedValue(baseSession);

    const conversation = {
      conversationId: "conv-1",
      userId: "user-123",
      departmentCodes: ["001"],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [
        {
          id: "msg-1",
          role: "user" as const,
          content: "テストメッセージ",
          timestamp: Date.now(),
          error: undefined,
        },
      ],
    };

    getConversationMock.mockResolvedValue(conversation);

    const request = createRequest("http://localhost/chat?conversationId=conv-1");
    const response = await loader({ request } as never);

    const data = await response.json();
    expect(data.initialMessages?.[0]).toMatchObject({
      id: "msg-1",
      conversationId: "conv-1",
      role: "user",
      content: "テストメッセージ",
      isStreaming: false,
      isComplete: true,
    });
  });
});





