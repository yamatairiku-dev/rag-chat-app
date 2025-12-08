import { describe, expect, it, beforeEach, vi } from "vitest";
import { ConversationManager } from "~/lib/chat/conversation-manager";

describe("ConversationManager", () => {
  // 元のsessionStorageを保存
  const originalSessionStorage = global.window?.sessionStorage;

  beforeEach(() => {
    // sessionStorageをクリア
    if (global.window?.sessionStorage) {
      global.window.sessionStorage.clear();
    }
    vi.clearAllMocks();
  });

  afterEach(() => {
    // sessionStorageをクリア
    if (global.window?.sessionStorage) {
      global.window.sessionStorage.clear();
    }
  });

  describe("getConversationId", () => {
    it("正常系: セッションストレージから会話IDを取得できる", () => {
      if (!global.window?.sessionStorage) {
        // jsdom環境でsessionStorageが利用可能な場合のみテスト
        return;
      }

      global.window.sessionStorage.setItem("rag-chat-conversation-id", "conv-123");

      const result = ConversationManager.getConversationId();

      expect(result).toBe("conv-123");
    });

    it("正常系: 会話IDが存在しない場合はnullを返す", () => {
      if (!global.window?.sessionStorage) {
        return;
      }

      const result = ConversationManager.getConversationId();

      expect(result).toBeNull();
    });

    it("正常系: windowがundefinedの場合はnullを返す（サーバーサイド）", () => {
      const originalWindow = global.window;
      // @ts-expect-error - テストのためにwindowを削除
      delete global.window;

      const result = ConversationManager.getConversationId();

      expect(result).toBeNull();

      // 復元
      global.window = originalWindow;
    });
  });

  describe("setConversationId", () => {
    it("正常系: セッションストレージに会話IDを保存できる", () => {
      if (!global.window?.sessionStorage) {
        return;
      }

      ConversationManager.setConversationId("conv-456");

      expect(global.window.sessionStorage.getItem("rag-chat-conversation-id")).toBe("conv-456");
    });

    it("正常系: 既存の会話IDを上書きできる", () => {
      if (!global.window?.sessionStorage) {
        return;
      }

      global.window.sessionStorage.setItem("rag-chat-conversation-id", "conv-old");

      ConversationManager.setConversationId("conv-new");

      expect(global.window.sessionStorage.getItem("rag-chat-conversation-id")).toBe("conv-new");
    });

    it("正常系: windowがundefinedの場合は何もしない（サーバーサイド）", () => {
      const originalWindow = global.window;
      // @ts-expect-error - テストのためにwindowを削除
      delete global.window;

      expect(() => {
        ConversationManager.setConversationId("conv-456");
      }).not.toThrow();

      // 復元
      global.window = originalWindow;
    });
  });

  describe("clearConversationId", () => {
    it("正常系: セッションストレージから会話IDを削除できる", () => {
      if (!global.window?.sessionStorage) {
        return;
      }

      global.window.sessionStorage.setItem("rag-chat-conversation-id", "conv-123");

      ConversationManager.clearConversationId();

      expect(global.window.sessionStorage.getItem("rag-chat-conversation-id")).toBeNull();
    });

    it("正常系: 会話IDが存在しない場合でもエラーにならない", () => {
      if (!global.window?.sessionStorage) {
        return;
      }

      expect(() => {
        ConversationManager.clearConversationId();
      }).not.toThrow();

      expect(global.window.sessionStorage.getItem("rag-chat-conversation-id")).toBeNull();
    });

    it("正常系: windowがundefinedの場合は何もしない（サーバーサイド）", () => {
      const originalWindow = global.window;
      // @ts-expect-error - テストのためにwindowを削除
      delete global.window;

      expect(() => {
        ConversationManager.clearConversationId();
      }).not.toThrow();

      // 復元
      global.window = originalWindow;
    });
  });

  describe("startNewConversation", () => {
    it("正常系: 会話IDをクリアして新しい会話を開始する", () => {
      if (!global.window?.sessionStorage) {
        return;
      }

      global.window.sessionStorage.setItem("rag-chat-conversation-id", "conv-123");

      ConversationManager.startNewConversation();

      expect(global.window.sessionStorage.getItem("rag-chat-conversation-id")).toBeNull();
    });

    it("正常系: 会話IDが存在しない場合でもエラーにならない", () => {
      if (!global.window?.sessionStorage) {
        return;
      }

      expect(() => {
        ConversationManager.startNewConversation();
      }).not.toThrow();

      expect(global.window.sessionStorage.getItem("rag-chat-conversation-id")).toBeNull();
    });
  });

  describe("統合テスト", () => {
    it("正常系: 会話IDの設定→取得→削除のフロー", () => {
      if (!global.window?.sessionStorage) {
        return;
      }

      // 設定
      ConversationManager.setConversationId("conv-integration-1");
      expect(ConversationManager.getConversationId()).toBe("conv-integration-1");

      // 更新
      ConversationManager.setConversationId("conv-integration-2");
      expect(ConversationManager.getConversationId()).toBe("conv-integration-2");

      // 削除
      ConversationManager.clearConversationId();
      expect(ConversationManager.getConversationId()).toBeNull();
    });

    it("正常系: 新しい会話開始→設定→取得のフロー", () => {
      if (!global.window?.sessionStorage) {
        return;
      }

      // 既存の会話IDを設定
      ConversationManager.setConversationId("conv-old");

      // 新しい会話を開始
      ConversationManager.startNewConversation();
      expect(ConversationManager.getConversationId()).toBeNull();

      // 新しい会話IDを設定
      ConversationManager.setConversationId("conv-new");
      expect(ConversationManager.getConversationId()).toBe("conv-new");
    });
  });
});

