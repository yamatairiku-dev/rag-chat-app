import { randomUUID } from "crypto";
import type { MessageRole } from "~/types/chat";

export interface ConversationMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  error?: string;
}

export interface ConversationRecord {
  conversationId: string;
  userId: string;
  departmentCode: string;
  createdAt: number;
  updatedAt: number;
  messages: ConversationMessage[];
}

type ConversationStore = Map<string, ConversationRecord>;

const conversations: ConversationStore = new Map();

interface AppendConversationMessagesArgs {
  conversationId?: string;
  userId: string;
  departmentCode: string;
  messages: ConversationMessage[];
}

/**
 * 会話メッセージを保存する（インメモリ実装）。
 * conversationIdが未指定の場合は新しく採番して返却する。
 */
export async function appendConversationMessages({
  conversationId,
  userId,
  departmentCode,
  messages,
}: AppendConversationMessagesArgs): Promise<string> {
  const now = Date.now();
  const resolvedConversationId = conversationId ?? randomUUID();

  const existing = conversations.get(resolvedConversationId);
  if (existing) {
    existing.messages.push(...messages);
    existing.updatedAt = now;
    return resolvedConversationId;
  }

  conversations.set(resolvedConversationId, {
    conversationId: resolvedConversationId,
    userId,
    departmentCode,
    createdAt: now,
    updatedAt: now,
    messages: [...messages],
  });

  return resolvedConversationId;
}

export async function getConversation(
  conversationId: string,
): Promise<ConversationRecord | null> {
  return conversations.get(conversationId) ?? null;
}

export async function listConversationsForUser(
  userId: string,
): Promise<ConversationRecord[]> {
  return Array.from(conversations.values()).filter(
    (conversation) => conversation.userId === userId,
  );
}

export async function clearConversations(): Promise<void> {
  conversations.clear();
}

