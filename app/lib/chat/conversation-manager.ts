/**
 * ブラウザのセッションストレージに会話IDを保存して継続性を担保するユーティリティ。
 */
export class ConversationManager {
  private static readonly STORAGE_KEY = "rag-chat-conversation-id";

  static getConversationId(): string | null {
    if (typeof window === "undefined") {
      return null;
    }
    return sessionStorage.getItem(this.STORAGE_KEY);
  }

  static setConversationId(conversationId: string): void {
    if (typeof window === "undefined") {
      return;
    }
    sessionStorage.setItem(this.STORAGE_KEY, conversationId);
  }

  static clearConversationId(): void {
    if (typeof window === "undefined") {
      return;
    }
    sessionStorage.removeItem(this.STORAGE_KEY);
  }

  static startNewConversation(): void {
    this.clearConversationId();
  }
}

