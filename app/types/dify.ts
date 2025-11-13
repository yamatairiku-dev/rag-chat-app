/**
 * Dify API リクエスト（共通部分）
 */
interface DifyRequestBase {
  /** ユーザー情報 */
  inputs: {
    user_id: string;
    department_code: string;
  };
  /** ユーザーの質問 */
  query: string;
  /** 会話ID（新規の場合は空文字） */
  conversation_id?: string;
  /** ユーザー識別子 */
  user: string;
}

/**
 * Dify チャットリクエスト（ブロッキングモード）
 */
export interface DifyChatRequest extends DifyRequestBase {
  response_mode: "blocking";
}

/**
 * Dify チャットリクエスト（ストリーミングモード）
 */
export interface DifyStreamRequest extends DifyRequestBase {
  response_mode: "streaming";
}

/**
 * Dify チャットレスポンス（ブロッキングモード）
 */
export interface DifyChatResponse {
  event: "message";
  message_id: string;
  conversation_id: string;
  mode: "chat";
  answer: string;
  metadata: {
    usage: {
      prompt_tokens: number;
      prompt_unit_price: string;
      prompt_price_unit: string;
      prompt_price: string;
      completion_tokens: number;
      completion_unit_price: string;
      completion_price_unit: string;
      completion_price: string;
      total_tokens: number;
      total_price: string;
      currency: string;
      latency: number;
    };
    retriever_resources: Array<{
      position: number;
      dataset_id: string;
      dataset_name: string;
      document_id: string;
      document_name: string;
      segment_id: string;
      score: number;
      content: string;
    }>;
  };
  created_at: number;
}

/**
 * Dify SSE イベント（ストリーミングモード）
 */
export type DifyStreamEvent =
  | DifyMessageStartEvent
  | DifyMessageChunkEvent
  | DifyMessageEndEvent
  | DifyErrorEvent;

/**
 * メッセージ開始イベント
 */
export interface DifyMessageStartEvent {
  event: "message";
  task_id: string;
  id: string;
  message_id: string;
  conversation_id: string;
  mode: "chat";
  answer: "";
  created_at: number;
}

/**
 * メッセージチャンクイベント
 */
export interface DifyMessageChunkEvent {
  event: "message";
  task_id: string;
  id: string;
  message_id: string;
  conversation_id: string;
  mode: "chat";
  answer: string;
  created_at: number;
}

/**
 * メッセージ終了イベント
 */
export interface DifyMessageEndEvent {
  event: "message_end";
  task_id: string;
  id: string;
  message_id: string;
  conversation_id: string;
  mode: "chat";
  metadata: {
    usage: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
      total_price: string;
      currency: string;
      latency: number;
    };
    retriever_resources: Array<any>;
  };
  created_at: number;
}

/**
 * エラーイベント
 */
export interface DifyErrorEvent {
  event: "error";
  task_id: string;
  message_id: string;
  status: number;
  code: string;
  message: string;
}

/**
 * Dify エラーレスポンス
 */
export interface DifyErrorResponse {
  code: string;
  message: string;
  status: number;
}

