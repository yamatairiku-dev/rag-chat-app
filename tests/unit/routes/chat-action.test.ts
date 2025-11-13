import { describe, expect, it, beforeEach, afterAll, vi } from "vitest";
import { AppError, ErrorCode } from "~/types/error";

vi.mock("~/lib/session/session-manager", () => {
  const requireUserSession = vi.fn();
  const getSessionWithId = vi.fn();
  return {
    __esModule: true,
    createSession: vi.fn(),
    deleteSession: vi.fn(),
    getSession: vi.fn(),
    getSessionWithId,
    updateSession: vi.fn(),
    requireUserSession,
  };
});

vi.mock("~/lib/session/token-refresh", () => ({
  ensureValidToken: vi.fn(),
}));

vi.mock("~/lib/utils/env", () => ({
  env: {
    MAX_MESSAGE_LENGTH: 2000,
    DIFY_API_URL: "https://dify.test/api",
    DIFY_API_KEY: "app-test-key",
    DIFY_TIMEOUT: 5000,
  },
}));

import { action } from "~/routes/chat";
import { DifyClient } from "~/lib/dify/client";
import { env } from "~/lib/utils/env";
import type { UserSession } from "~/types/session";
import { requireUserSession } from "~/lib/session/session-manager";

const requireUserSessionMock = vi.mocked(requireUserSession);
const sendMessageSpy = vi.spyOn(DifyClient.prototype, "sendMessage");

function createRequest(body: Record<string, string>) {
  return new Request("http://localhost/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(body),
  });
}

const baseSession: UserSession = {
  userId: "user-1",
  userEmail: "user@test",
  displayName: "テスト 太郎",
  departmentCode: "001",
  departmentName: "営業部",
  accessToken: "token",
  refreshToken: "refresh",
  tokenExpiresAt: Date.now() + 3600 * 1000,
  createdAt: Date.now(),
  lastAccessedAt: Date.now(),
};

afterAll(() => {
  sendMessageSpy.mockRestore();
});

describe("chat action", () => {
  beforeEach(() => {
    sendMessageSpy.mockReset();
    requireUserSessionMock.mockReset();
    requireUserSessionMock.mockResolvedValue({
      ...baseSession,
    });
    env.MAX_MESSAGE_LENGTH = 2000;
  });

  it("メッセージが空の場合は400を返す", async () => {
    sendMessageSpy.mockResolvedValue({} as never);
    const request = createRequest({ query: "   ", conversation_id: "" });
    const response = await action({ request } as never);

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      success: false,
    });
    expect(sendMessageSpy).not.toHaveBeenCalled();
  });

  it("長すぎるメッセージは400を返す", async () => {
    sendMessageSpy.mockResolvedValue({} as never);
    env.MAX_MESSAGE_LENGTH = 5;
    const request = createRequest({ query: "123456", conversation_id: "" });
    const response = await action({ request } as never);

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      success: false,
      error: expect.stringContaining("長すぎ"),
    });
    expect(sendMessageSpy).not.toHaveBeenCalled();
  });

  it("Difyクライアントが成功した場合はレスポンスを返す", async () => {
    const difyResponse = {
      event: "message",
      answer: "こちらが回答です。",
      conversation_id: "conv-123",
      message_id: "msg-999",
      mode: "chat",
      metadata: {
        usage: {
          prompt_tokens: 1,
          prompt_unit_price: "0",
          prompt_price_unit: "token",
          prompt_price: "0",
          completion_tokens: 1,
          completion_unit_price: "0",
          completion_price_unit: "token",
          completion_price: "0",
          total_tokens: 2,
          total_price: "0",
          currency: "JPY",
          latency: 10,
        },
        retriever_resources: [],
      },
      created_at: Date.now(),
    };

    sendMessageSpy.mockResolvedValue(difyResponse as never);

    const request = createRequest({
      query: "  社内規則について  ",
      conversation_id: "",
    });

    const response = await action({ request } as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      answer: difyResponse.answer,
      conversationId: difyResponse.conversation_id,
      messageId: difyResponse.message_id,
    });

    expect(sendMessageSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        query: "社内規則について",
        conversation_id: "",
      }),
    );
  });

  it("DifyクライアントがAppErrorを返した場合はエラーレスポンスを返す", async () => {
    sendMessageSpy.mockRejectedValue(
      new AppError(
        ErrorCode.DIFY_API_ERROR,
        "サービスが一時的に利用できません",
        503,
      ),
    );

    const request = createRequest({
      query: "ヘルプ",
      conversation_id: "conv-1",
    });

    const response = await action({ request } as never);
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toMatchObject({
      success: false,
      error: "サービスが一時的に利用できません",
    });
  });
});
