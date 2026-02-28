/**
 * メッセージの役割
 */
export type MessageRole = "user" | "assistant" | "system";

/**
 * チャットメッセージ
 */
export interface Message {
  /** メッセージID */
  id: string;
  /** 会話ID */
  conversationId: string;
  /** メッセージの役割 */
  role: MessageRole;
  /** メッセージ内容 */
  content: string;
  /** 作成日時 (Unix timestamp) */
  timestamp: number;
  /** ストリーミング中かどうか */
  isStreaming?: boolean;
  /** メッセージが完了したかどうか */
  isComplete?: boolean;
  /** エラー情報 */
  error?: string;
  /** リトライ用のクエリ（エラー時に使用） */
  retryQuery?: string;
}

/**
 * チャットセッション
 */
export interface ChatSession {
  /** 会話ID */
  conversationId: string;
  /** 会話タイトル */
  title: string;
  /** メッセージ一覧 */
  messages: Message[];
  /** 作成日時 (Unix timestamp) */
  createdAt: number;
  /** 更新日時 (Unix timestamp) */
  updatedAt: number;
  /** ユーザーID */
  userId: string;
  /** 所属コードの配列 */
  departmentCodes: string[];
}

/**
 * チャットログ（分析用）
 */
export interface ChatLog {
  /** ログID */
  logId: string;
  /** メッセージID */
  messageId: string;
  /** 会話ID */
  conversationId: string;
  /** ユーザーID */
  userId: string;
  /** ユーザーEmail */
  userEmail: string;
  /** 所属コードの配列（カンマ区切りで記録することも可） */
  departmentCode: string;
  /** ユーザーの質問 */
  query: string;
  /** AIの回答 */
  answer: string;
  /** タイムスタンプ (Unix timestamp) */
  timestamp: number;
  /** 使用トークン数 */
  tokensUsed?: {
    prompt: number;
    completion: number;
    total: number;
  };
  /** レスポンスタイム (ms) */
  responseTime?: number;
  /** 検索結果のメタデータ */
  metadata?: {
    retriever_resources?: Array<{
      dataset_name: string;
      document_name: string;
      score: number;
    }>;
  };
}

