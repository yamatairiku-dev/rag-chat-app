import { describe, expect, it, beforeEach } from "vitest";
import {
  appendConversationMessages,
  getConversation,
  listConversationsForUser,
  deleteConversation,
  clearConversations,
} from "~/lib/chat/conversation-store.server";
import type { ConversationMessage } from "~/lib/chat/conversation-store.server";

describe("conversation-store", () => {
  const createTestMessage = (
    role: "user" | "assistant" = "user",
    content: string = "テストメッセージ"
  ): ConversationMessage => ({
    id: `msg-${Date.now()}-${Math.random()}`,
    role,
    content,
    timestamp: Date.now(),
  });

  beforeEach(async () => {
    // 各テスト前にストレージをクリア
    // 注意: conversation-storeはインメモリ実装なので、直接クリアできない
    // 代わりに、既存の会話を削除する
    const testConversationIds = ["conv-1", "conv-2", "conv-3"];
    for (const conversationId of testConversationIds) {
      try {
        await deleteConversation(conversationId);
      } catch {
        // 会話が存在しない場合は無視
      }
    }
  });

  describe("appendConversationMessages", () => {
    it("正常系: 新しい会話を作成してメッセージを保存する", async () => {
      const userId = "user-123";
      const departmentCode = "001";
      const messages = [createTestMessage("user", "こんにちは")];

      const conversationId = await appendConversationMessages({
        userId,
        departmentCode,
        messages,
      });

      expect(conversationId).toBeDefined();
      expect(typeof conversationId).toBe("string");

      const conversation = await getConversation(conversationId);
      expect(conversation).not.toBeNull();
      expect(conversation?.userId).toBe(userId);
      expect(conversation?.departmentCode).toBe(departmentCode);
      expect(conversation?.messages).toHaveLength(1);
      expect(conversation?.messages[0]?.content).toBe("こんにちは");
    });

    it("正常系: 既存の会話にメッセージを追加する", async () => {
      const userId = "user-123";
      const departmentCode = "001";
      const conversationId = "conv-1";
      const messages1 = [createTestMessage("user", "最初のメッセージ")];
      const messages2 = [createTestMessage("assistant", "返信メッセージ")];

      // 最初のメッセージを追加
      const id1 = await appendConversationMessages({
        conversationId,
        userId,
        departmentCode,
        messages: messages1,
      });

      // 2番目のメッセージを追加
      const id2 = await appendConversationMessages({
        conversationId,
        userId,
        departmentCode,
        messages: messages2,
      });

      expect(id1).toBe(conversationId);
      expect(id2).toBe(conversationId);

      const conversation = await getConversation(conversationId);
      expect(conversation?.messages).toHaveLength(2);
      expect(conversation?.messages[0]?.content).toBe("最初のメッセージ");
      expect(conversation?.messages[1]?.content).toBe("返信メッセージ");
    });

    it("正常系: conversationIdが未指定の場合は新しいIDを生成する", async () => {
      const userId = "user-123";
      const departmentCode = "001";
      const messages = [createTestMessage()];

      const conversationId1 = await appendConversationMessages({
        userId,
        departmentCode,
        messages,
      });

      const conversationId2 = await appendConversationMessages({
        userId,
        departmentCode,
        messages,
      });

      expect(conversationId1).not.toBe(conversationId2);
    });

    it("正常系: 複数のメッセージを一度に追加できる", async () => {
      const userId = "user-123";
      const departmentCode = "001";
      const messages = [
        createTestMessage("user", "メッセージ1"),
        createTestMessage("assistant", "メッセージ2"),
        createTestMessage("user", "メッセージ3"),
      ];

      const conversationId = await appendConversationMessages({
        userId,
        departmentCode,
        messages,
      });

      const conversation = await getConversation(conversationId);
      expect(conversation?.messages).toHaveLength(3);
    });

    it("正常系: 既存の会話にメッセージを追加するとupdatedAtが更新される", async () => {
      const userId = "user-123";
      const departmentCode = "001";
      const conversationId = "conv-1";
      const messages1 = [createTestMessage("user", "最初のメッセージ")];

      // 最初のメッセージを追加
      await appendConversationMessages({
        conversationId,
        userId,
        departmentCode,
        messages: messages1,
      });

      const conversation1 = await getConversation(conversationId);
      const firstUpdatedAt = conversation1?.updatedAt;

      // 少し待ってから2番目のメッセージを追加
      await new Promise((resolve) => setTimeout(resolve, 10));
      const messages2 = [createTestMessage("assistant", "返信メッセージ")];
      await appendConversationMessages({
        conversationId,
        userId,
        departmentCode,
        messages: messages2,
      });

      const conversation2 = await getConversation(conversationId);
      expect(conversation2?.updatedAt).toBeGreaterThan(firstUpdatedAt!);
    });
  });

  describe("getConversation", () => {
    it("正常系: 存在する会話を取得できる", async () => {
      const userId = "user-123";
      const departmentCode = "001";
      const conversationId = "conv-1";
      const messages = [createTestMessage("user", "テストメッセージ")];

      await appendConversationMessages({
        conversationId,
        userId,
        departmentCode,
        messages,
      });

      const conversation = await getConversation(conversationId);

      expect(conversation).not.toBeNull();
      expect(conversation?.conversationId).toBe(conversationId);
      expect(conversation?.userId).toBe(userId);
      expect(conversation?.departmentCode).toBe(departmentCode);
    });

    it("異常系: 存在しない会話の場合はnullを返す", async () => {
      const conversation = await getConversation("non-existent-conv");

      expect(conversation).toBeNull();
    });
  });

  describe("listConversationsForUser", () => {
    it("正常系: ユーザーの会話一覧を取得できる", async () => {
      const userId = "user-123";
      const departmentCode = "001";
      const messages = [createTestMessage()];

      // 3つの会話を作成
      const conv1 = await appendConversationMessages({
        userId,
        departmentCode,
        messages,
      });
      const conv2 = await appendConversationMessages({
        userId,
        departmentCode,
        messages,
      });
      const conv3 = await appendConversationMessages({
        userId,
        departmentCode,
        messages,
      });

      const conversations = await listConversationsForUser(userId);

      expect(conversations.length).toBeGreaterThanOrEqual(3);
      const conversationIds = conversations.map((c) => c.conversationId);
      expect(conversationIds).toContain(conv1);
      expect(conversationIds).toContain(conv2);
      expect(conversationIds).toContain(conv3);
    });

    it("正常系: 他のユーザーの会話は含まれない", async () => {
      const userId1 = "user-123";
      const userId2 = "user-456";
      const departmentCode = "001";
      const messages = [createTestMessage()];

      await appendConversationMessages({
        userId: userId1,
        departmentCode,
        messages,
      });
      await appendConversationMessages({
        userId: userId2,
        departmentCode,
        messages,
      });

      const conversations = await listConversationsForUser(userId1);

      expect(conversations.every((c) => c.userId === userId1)).toBe(true);
    });

    it("正常系: 会話がない場合は空の配列を返す", async () => {
      const conversations = await listConversationsForUser("non-existent-user");

      expect(conversations).toEqual([]);
    });
  });

  describe("deleteConversation", () => {
    it("正常系: 会話を削除できる", async () => {
      const userId = "user-123";
      const departmentCode = "001";
      const conversationId = "conv-1";
      const messages = [createTestMessage()];

      await appendConversationMessages({
        conversationId,
        userId,
        departmentCode,
        messages,
      });

      await deleteConversation(conversationId);

      const conversation = await getConversation(conversationId);
      expect(conversation).toBeNull();
    });

    it("正常系: 存在しない会話を削除してもエラーが発生しない", async () => {
      await expect(deleteConversation("non-existent-conv")).resolves.not.toThrow();
    });

    it("正常系: 削除後は会話一覧に含まれない", async () => {
      const userId = "user-123";
      const departmentCode = "001";
      const conversationId = "conv-1";
      const messages = [createTestMessage()];

      await appendConversationMessages({
        conversationId,
        userId,
        departmentCode,
        messages,
      });

      await deleteConversation(conversationId);

      const conversations = await listConversationsForUser(userId);
      const conversationIds = conversations.map((c) => c.conversationId);
      expect(conversationIds).not.toContain(conversationId);
    });
  });

  describe("clearConversations", () => {
    it("正常系: すべての会話を削除できる", async () => {
      const userId = "user-123";
      const departmentCode = "001";
      const messages = [createTestMessage()];

      // 複数の会話を作成
      const conv1 = await appendConversationMessages({
        userId,
        departmentCode,
        messages,
      });
      const conv2 = await appendConversationMessages({
        userId,
        departmentCode,
        messages,
      });

      // 会話が存在することを確認
      expect(await getConversation(conv1)).not.toBeNull();
      expect(await getConversation(conv2)).not.toBeNull();

      // すべての会話を削除
      await clearConversations();

      // 会話が削除されたことを確認
      expect(await getConversation(conv1)).toBeNull();
      expect(await getConversation(conv2)).toBeNull();
      expect(await listConversationsForUser(userId)).toEqual([]);
    });

    it("正常系: 会話がない場合でもエラーが発生しない", async () => {
      await expect(clearConversations()).resolves.not.toThrow();
    });
  });
});


