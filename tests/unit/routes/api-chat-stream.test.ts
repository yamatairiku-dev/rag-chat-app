import { describe, expect, it, beforeEach, vi } from "vitest";
import type { UserSession } from "~/types/session";

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
  departmentCode: "001",
  departmentName: "営業部",
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
      departmentCode: baseSession.departmentCode,
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
});
