import { describe, expect, it, beforeEach, vi } from "vitest";
import type { UserSession } from "~/types/session";
import type { ConversationRecord } from "~/lib/chat/conversation-store.server";

// モック
vi.mock("~/lib/session/session-manager", () => ({
  requireUserSession: vi.fn(),
}));

vi.mock("~/lib/chat/conversation-store.server", () => ({
  listConversationsForUser: vi.fn(),
  getConversation: vi.fn(),
  deleteConversation: vi.fn(),
}));

import { loader, action } from "~/routes/conversations";
import { requireUserSession } from "~/lib/session/session-manager";
import {
  listConversationsForUser,
  getConversation,
  deleteConversation,
} from "~/lib/chat/conversation-store.server";

const requireUserSessionMock = vi.mocked(requireUserSession);
const listConversationsForUserMock = vi.mocked(listConversationsForUser);
const getConversationMock = vi.mocked(getConversation);
const deleteConversationMock = vi.mocked(deleteConversation);

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

function createRequest(url: string = "http://localhost/conversations") {
  return new Request(url);
}

function createFormRequest(formData: Record<string, string>) {
  const form = new FormData();
  Object.entries(formData).forEach(([key, value]) => {
    form.append(key, value);
  });
  return new Request("http://localhost/conversations", {
    method: "POST",
    body: form,
  });
}

describe("conversations route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUserSessionMock.mockResolvedValue(baseSession);
  });

  describe("loader", () => {
    it("正常系: 会話一覧を取得できる", async () => {
      const conversations: ConversationRecord[] = [
        {
          conversationId: "conv-1",
          userId: "user-123",
          departmentCodes: ["001"],
          createdAt: Date.now() - 10000,
          updatedAt: Date.now() - 5000,
          messages: [
            {
              id: "msg-1",
              role: "user",
              content: "テストメッセージ",
              timestamp: Date.now() - 5000,
            },
          ],
        },
      ];

      listConversationsForUserMock.mockResolvedValue(conversations);

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
      expect(data.conversations).toHaveLength(1);
      expect(listConversationsForUserMock).toHaveBeenCalledWith(baseSession.userId);
    });

    it("正常系: limitパラメータが指定された場合は制限される", async () => {
      const conversations: ConversationRecord[] = Array.from({ length: 50 }, (_, i) => ({
        conversationId: `conv-${i}`,
        userId: "user-123",
        departmentCodes: ["001"],
        createdAt: Date.now() - 10000,
        updatedAt: Date.now() - i * 1000,
        messages: [],
      }));

      listConversationsForUserMock.mockResolvedValue(conversations);

      const request = createRequest("http://localhost/conversations?limit=10");
      const response = await loader({ request } as never);

      const data = await response.json();
      expect(data.conversations).toHaveLength(10);
    });

    it("正常系: limitパラメータが100を超える場合は100に制限される", async () => {
      const conversations: ConversationRecord[] = Array.from({ length: 150 }, (_, i) => ({
        conversationId: `conv-${i}`,
        userId: "user-123",
        departmentCodes: ["001"],
        createdAt: Date.now() - 10000,
        updatedAt: Date.now() - i * 1000,
        messages: [],
      }));

      listConversationsForUserMock.mockResolvedValue(conversations);

      const request = createRequest("http://localhost/conversations?limit=200");
      const response = await loader({ request } as never);

      const data = await response.json();
      expect(data.conversations.length).toBeLessThanOrEqual(100);
    });

    it("正常系: limitパラメータが数値でない場合はデフォルト値を使用", async () => {
      const conversations: ConversationRecord[] = Array.from({ length: 30 }, (_, i) => ({
        conversationId: `conv-${i}`,
        userId: "user-123",
        departmentCodes: ["001"],
        createdAt: Date.now() - 10000,
        updatedAt: Date.now() - i * 1000,
        messages: [],
      }));

      listConversationsForUserMock.mockResolvedValue(conversations);

      const request = createRequest("http://localhost/conversations?limit=invalid");
      const response = await loader({ request } as never);

      const data = await response.json();
      expect(data.conversations.length).toBeLessThanOrEqual(20);
    });

    it("正常系: limitパラメータが0以下の場合はデフォルト値を使用", async () => {
      const conversations: ConversationRecord[] = Array.from({ length: 30 }, (_, i) => ({
        conversationId: `conv-${i}`,
        userId: "user-123",
        departmentCodes: ["001"],
        createdAt: Date.now() - 10000,
        updatedAt: Date.now() - i * 1000,
        messages: [],
      }));

      listConversationsForUserMock.mockResolvedValue(conversations);

      const request = createRequest("http://localhost/conversations?limit=0");
      const response = await loader({ request } as never);

      const data = await response.json();
      expect(data.conversations.length).toBeLessThanOrEqual(20);
    });

    it("正常系: limitパラメータが負の数の場合はデフォルト値を使用", async () => {
      const conversations: ConversationRecord[] = Array.from({ length: 30 }, (_, i) => ({
        conversationId: `conv-${i}`,
        userId: "user-123",
        departmentCodes: ["001"],
        createdAt: Date.now() - 10000,
        updatedAt: Date.now() - i * 1000,
        messages: [],
      }));

      listConversationsForUserMock.mockResolvedValue(conversations);

      const request = createRequest("http://localhost/conversations?limit=-10");
      const response = await loader({ request } as never);

      const data = await response.json();
      expect(data.conversations.length).toBeLessThanOrEqual(20);
    });

    it("正常系: 会話がない場合は空の配列を返す", async () => {
      listConversationsForUserMock.mockResolvedValue([]);

      const request = createRequest();
      const response = await loader({ request } as never);

      const data = await response.json();
      expect(data.conversations).toEqual([]);
    });

    it("正常系: 会話はupdatedAtでソートされる（新しい順）", async () => {
      const now = Date.now();
      const conversations: ConversationRecord[] = [
        {
          conversationId: "conv-1",
          userId: "user-123",
          departmentCodes: ["001"],
          createdAt: now - 10000,
          updatedAt: now - 5000,
          messages: [],
        },
        {
          conversationId: "conv-2",
          userId: "user-123",
          departmentCodes: ["001"],
          createdAt: now - 8000,
          updatedAt: now - 2000,
          messages: [],
        },
      ];

      listConversationsForUserMock.mockResolvedValue(conversations);

      const request = createRequest();
      const response = await loader({ request } as never);

      const data = await response.json();
      expect(data.conversations[0]?.conversationId).toBe("conv-2");
      expect(data.conversations[1]?.conversationId).toBe("conv-1");
    });
  });

  describe("action", () => {
    it("正常系: 会話を削除できる", async () => {
      const conversation: ConversationRecord = {
        conversationId: "conv-1",
        userId: "user-123",
        departmentCodes: ["001"],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [],
      };

      getConversationMock.mockResolvedValue(conversation);
      deleteConversationMock.mockResolvedValue(undefined);

      const request = createFormRequest({
        action: "delete",
        conversation_id: "conv-1",
      });

      const response = await action({ request } as never);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(deleteConversationMock).toHaveBeenCalledWith("conv-1");
    });

    it("異常系: conversation_idが指定されていない場合は400を返す", async () => {
      const request = createFormRequest({
        action: "delete",
      });

      const response = await action({ request } as never);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain("会話IDが指定されていません");
    });

    it("異常系: conversation_idが空文字列の場合は400を返す", async () => {
      const request = createFormRequest({
        action: "delete",
        conversation_id: "   ",
      });

      const response = await action({ request } as never);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain("会話IDが指定されていません");
    });

    it("異常系: actionが空文字列の場合は400を返す", async () => {
      const request = createFormRequest({
        action: "",
        conversation_id: "conv-1",
      });

      const response = await action({ request } as never);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain("無効なアクションです");
    });

    it("異常系: 会話が見つからない場合は404を返す", async () => {
      getConversationMock.mockResolvedValue(null);

      const request = createFormRequest({
        action: "delete",
        conversation_id: "non-existent-conv",
      });

      const response = await action({ request } as never);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain("会話が見つかりません");
    });

    it("異常系: 他のユーザーの会話は削除できない", async () => {
      const conversation: ConversationRecord = {
        conversationId: "conv-1",
        userId: "other-user",
        departmentCodes: ["001"],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [],
      };

      getConversationMock.mockResolvedValue(conversation);

      const request = createFormRequest({
        action: "delete",
        conversation_id: "conv-1",
      });

      const response = await action({ request } as never);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain("会話が見つかりません");
    });

    it("異常系: 無効なアクションの場合は400を返す", async () => {
      const request = createFormRequest({
        action: "invalid-action",
        conversation_id: "conv-1",
      });

      const response = await action({ request } as never);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain("無効なアクションです");
    });
  });
});

