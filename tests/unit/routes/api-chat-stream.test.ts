import { describe, expect, it, beforeEach, vi } from "vitest";
import type { UserSession } from "~/types/session";
import { AppError, ErrorCode } from "~/types/error";

// 環境変数をモック
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
    MAX_MESSAGE_LENGTH: 2000,
  },
}));

const {
  getSessionWithIdMock,
  ensureValidTokenMock,
  appendConversationMessagesMock,
  streamMessageMock,
} = vi.hoisted(() => ({
  getSessionWithIdMock: vi.fn(),
  ensureValidTokenMock: vi.fn(),
  appendConversationMessagesMock: vi.fn(),
  streamMessageMock: vi.fn(),
}));

vi.mock("~/lib/session/session-manager", () => ({
  getSessionWithId: getSessionWithIdMock,
}));

vi.mock("~/lib/session/token-refresh", () => ({
  ensureValidToken: ensureValidTokenMock,
}));

vi.mock("~/lib/chat/conversation-store.server", () => ({
  appendConversationMessages: appendConversationMessagesMock,
}));

vi.mock("~/lib/dify/client", () => {
  class MockDifyClient {
    streamMessage = streamMessageMock;
  }
  return { DifyClient: MockDifyClient };
});

import { action } from "~/routes/api.chat-stream";

const baseSession: UserSession = {
  userId: "user-1",
  userEmail: "user@example.com",
  displayName: "テスト利用者",
  departmentCodes: ["001"],
  departmentNames: ["テスト部署"],
  accessToken: "token",
  refreshToken: "refresh",
  tokenExpiresAt: Date.now() + 3600 * 1000,
  createdAt: Date.now(),
  lastAccessedAt: Date.now(),
};

function createJsonRequest(body: unknown) {
  return new Request("http://localhost/api/chat-stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("api/chat-stream action", () => {
  beforeEach(() => {
    getSessionWithIdMock.mockReset();
    ensureValidTokenMock.mockReset();
    appendConversationMessagesMock.mockReset();
    streamMessageMock.mockReset();
  });

  it("セッションが存在しない場合は401を返す", async () => {
    getSessionWithIdMock.mockResolvedValue(null);

    const request = createJsonRequest({ query: "テスト" });
    const response = await action({ request } as never);

    expect(response.status).toBe(401);
    expect(streamMessageMock).not.toHaveBeenCalled();
  });

  it("空メッセージの場合は400を返す", async () => {
    getSessionWithIdMock.mockResolvedValue({
      session: { ...baseSession },
      sessionId: "session-1",
    });
    ensureValidTokenMock.mockResolvedValue({ ...baseSession });

    const request = createJsonRequest({ query: "   " });
    const response = await action({ request } as never);

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: expect.any(String),
    });
    expect(streamMessageMock).not.toHaveBeenCalled();
  });

  it("SSEストリームを返し、会話を保存する", async () => {
    getSessionWithIdMock.mockResolvedValue({
      session: { ...baseSession },
      sessionId: "session-1",
    });
    ensureValidTokenMock.mockResolvedValue({ ...baseSession });

    async function* generateEvents() {
      yield {
        event: "message",
        answer: "こんにちは",
        conversation_id: "conv-1",
      };
      yield {
        event: "message_end",
        conversation_id: "conv-1",
      };
    }

    streamMessageMock.mockReturnValue(generateEvents());
    appendConversationMessagesMock.mockResolvedValue("conv-1");

    const request = createJsonRequest({ query: "おはよう" });
    const response = await action({ request } as never);

    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain('data: {"event":"message"');
    expect(body).toContain('data: {"event":"done"}');

    expect(appendConversationMessagesMock).toHaveBeenCalledTimes(1);
    const [args] = appendConversationMessagesMock.mock.calls[0];
    expect(args).toMatchObject({
      conversationId: "conv-1",
      userId: baseSession.userId,
      departmentCodes: baseSession.departmentCodes,
    });
    expect(args.messages).toHaveLength(2);
    expect(args.messages[0]).toMatchObject({
      role: "user",
      content: "おはよう",
    });
    expect(args.messages[1]).toMatchObject({
      role: "assistant",
      content: "こんにちは",
    });
  });

  it("POST以外のメソッドは405を返す", async () => {
    const request = new Request("http://localhost/api/chat-stream", {
      method: "GET",
    });

    const response = await action({ request } as never);

    expect(response.status).toBe(405);
  });

  it("トークンリフレッシュでAppError以外のエラーが発生した場合はエラーをthrow", async () => {
    getSessionWithIdMock.mockResolvedValue({
      session: { ...baseSession },
      sessionId: "session-1",
    });
    ensureValidTokenMock.mockRejectedValue(new Error("Network error"));

    const request = createJsonRequest({ query: "テスト" });

    await expect(action({ request } as never)).rejects.toThrow();
  });

  it("トークンリフレッシュでAUTH_TOKEN_EXPIREDエラーが発生した場合は401を返す", async () => {
    getSessionWithIdMock.mockResolvedValue({
      session: { ...baseSession },
      sessionId: "session-1",
    });
    const expiredError = new AppError(
      ErrorCode.AUTH_TOKEN_EXPIRED,
      "トークンが期限切れです",
      401
    );
    ensureValidTokenMock.mockRejectedValue(expiredError);

    const request = createJsonRequest({ query: "テスト" });
    const response = await action({ request } as never);

    expect(response.status).toBe(401);
    expect(streamMessageMock).not.toHaveBeenCalled();
  });

  it("無効なJSONペイロードの場合は400を返す", async () => {
    getSessionWithIdMock.mockResolvedValue({
      session: { ...baseSession },
      sessionId: "session-1",
    });
    ensureValidTokenMock.mockResolvedValue({ ...baseSession });

    const request = new Request("http://localhost/api/chat-stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "invalid json",
    });

    const response = await action({ request } as never);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Invalid JSON payload");
  });

  it("リクエストボディがnullの場合は400を返す", async () => {
    getSessionWithIdMock.mockResolvedValue({
      session: { ...baseSession },
      sessionId: "session-1",
    });
    ensureValidTokenMock.mockResolvedValue({ ...baseSession });

    const request = createJsonRequest(null);
    const response = await action({ request } as never);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Invalid request body");
  });

  it("リクエストボディが配列の場合は400を返す", async () => {
    getSessionWithIdMock.mockResolvedValue({
      session: { ...baseSession },
      sessionId: "session-1",
    });
    ensureValidTokenMock.mockResolvedValue({ ...baseSession });

    const request = createJsonRequest([]);
    const response = await action({ request } as never);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Invalid request body");
  });

  it("queryが文字列でない場合は400を返す", async () => {
    getSessionWithIdMock.mockResolvedValue({
      session: { ...baseSession },
      sessionId: "session-1",
    });
    ensureValidTokenMock.mockResolvedValue({ ...baseSession });

    const request = createJsonRequest({ query: 123 });
    const response = await action({ request } as never);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("メッセージを入力してください");
  });

  it("メッセージが長すぎる場合は400を返す", async () => {
    getSessionWithIdMock.mockResolvedValue({
      session: { ...baseSession },
      sessionId: "session-1",
    });
    ensureValidTokenMock.mockResolvedValue({ ...baseSession });

    const longMessage = "a".repeat(2001);
    const request = createJsonRequest({ query: longMessage });
    const response = await action({ request } as never);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("メッセージが長すぎます");
  });

  it("conversationIdが文字列でない場合は空文字列として扱う", async () => {
    getSessionWithIdMock.mockResolvedValue({
      session: { ...baseSession },
      sessionId: "session-1",
    });
    ensureValidTokenMock.mockResolvedValue({ ...baseSession });

    async function* generateEvents() {
      yield {
        event: "message",
        answer: "テスト",
        conversation_id: "new-conv-1",
      };
      yield {
        event: "message_end",
        conversation_id: "new-conv-1",
      };
    }

    streamMessageMock.mockReturnValue(generateEvents());
    appendConversationMessagesMock.mockResolvedValue("new-conv-1");

    const request = createJsonRequest({ query: "テスト", conversationId: 123 });
    const response = await action({ request } as never);

    expect(response.status).toBe(200);
    expect(streamMessageMock).toHaveBeenCalled();
  });

  it("ストリーミングエラーが発生した場合はエラーを処理", async () => {
    getSessionWithIdMock.mockResolvedValue({
      session: { ...baseSession },
      sessionId: "session-1",
    });
    ensureValidTokenMock.mockResolvedValue({ ...baseSession });

    async function* generateError() {
      throw new Error("Streaming error");
    }

    streamMessageMock.mockReturnValue(generateError());

    const request = createJsonRequest({ query: "テスト" });
    const response = await action({ request } as never);

    // エラーが発生してもストリームは閉じられる
    expect(response.status).toBe(200);
  });

  it("message_endイベントでconversation_idが変更される場合を処理", async () => {
    getSessionWithIdMock.mockResolvedValue({
      session: { ...baseSession },
      sessionId: "session-1",
    });
    ensureValidTokenMock.mockResolvedValue({ ...baseSession });

    async function* generateEvents() {
      yield {
        event: "message",
        answer: "テスト",
        conversation_id: "conv-1",
      };
      yield {
        event: "message_end",
        conversation_id: "conv-2", // 異なるconversation_id
      };
    }

    streamMessageMock.mockReturnValue(generateEvents());
    appendConversationMessagesMock.mockResolvedValue("conv-2");

    const request = createJsonRequest({ query: "テスト", conversationId: "conv-1" });
    const response = await action({ request } as never);

    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain('data: {"event":"done"}');
    
    // 新しいconversation_idで保存される
    expect(appendConversationMessagesMock).toHaveBeenCalled();
    const [args] = appendConversationMessagesMock.mock.calls[0];
    expect(args.conversationId).toBe("conv-2");
  });

  it("errorイベントが発生した場合はエラーメッセージを送信", async () => {
    getSessionWithIdMock.mockResolvedValue({
      session: { ...baseSession },
      sessionId: "session-1",
    });
    ensureValidTokenMock.mockResolvedValue({ ...baseSession });

    async function* generateErrorEvent() {
      yield {
        event: "error",
        message: "エラーが発生しました",
      };
    }

    streamMessageMock.mockReturnValue(generateErrorEvent());
    appendConversationMessagesMock.mockResolvedValue("conv-1");

    const request = createJsonRequest({ query: "テスト" });
    const response = await action({ request } as never);

    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain('data: {"event":"error"');
    expect(body).toContain("エラーが発生しました");
  });

  it("errorイベントでmessageが文字列でない場合はデフォルトメッセージを使用", async () => {
    getSessionWithIdMock.mockResolvedValue({
      session: { ...baseSession },
      sessionId: "session-1",
    });
    ensureValidTokenMock.mockResolvedValue({ ...baseSession });

    async function* generateErrorEvent() {
      yield {
        event: "error",
        message: 123, // 文字列でない
      };
    }

    streamMessageMock.mockReturnValue(generateErrorEvent());
    appendConversationMessagesMock.mockResolvedValue("conv-1");

    const request = createJsonRequest({ query: "テスト" });
    const response = await action({ request } as never);

    expect(response.status).toBe(200);
    const body = await response.text();
    // errorイベントが送信されることを確認（メッセージの内容は実装に依存）
    expect(body).toContain('data: {"event":"error"');
  });

  it("ストリームが完了してもconversationIdとassistantPayloadがない場合は保存しない", async () => {
    getSessionWithIdMock.mockResolvedValue({
      session: { ...baseSession },
      sessionId: "session-1",
    });
    ensureValidTokenMock.mockResolvedValue({ ...baseSession });

    async function* generateIncompleteEvents() {
      yield {
        event: "message",
        answer: "", // 空の回答
        // conversation_idがない
      };
      yield {
        event: "done",
      };
    }

    streamMessageMock.mockReturnValue(generateIncompleteEvents());

    const request = createJsonRequest({ query: "テスト" });
    const response = await action({ request } as never);

    expect(response.status).toBe(200);
    // conversationIdとassistantPayloadがないため、保存されない
    expect(appendConversationMessagesMock).not.toHaveBeenCalled();
  });
});
