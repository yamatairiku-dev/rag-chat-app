import type {
  DifyChatRequest,
  DifyChatResponse,
  DifyErrorResponse,
  DifyStreamEvent,
  DifyStreamRequest,
} from "~/types/dify";
import { env } from "~/lib/utils/env";
import { AppError, ErrorCode } from "~/types/error";

const CHAT_MESSAGES_ENDPOINT = "/chat-messages";

/**
 * Dify APIクライアント
 *
 * ブロッキングレスポンスとストリーミングレスポンスの両方を扱う。
 */
export class DifyClient {
  constructor(
    private readonly baseUrl: string = env.DIFY_API_URL,
    private readonly apiKey: string = env.DIFY_API_KEY,
  ) {}

  private createHeaders(): HeadersInit {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    };
  }

  private buildUrl(path: string): string {
    return `${this.baseUrl.replace(/\/$/, "")}${path}`;
  }

  /**
   * ブロッキングモードのチャットメッセージ送信
   */
  async sendMessage(request: DifyChatRequest): Promise<DifyChatResponse> {
    try {
      const response = await fetch(this.buildUrl(CHAT_MESSAGES_ENDPOINT), {
        method: "POST",
        headers: this.createHeaders(),
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(env.DIFY_TIMEOUT),
      });

      const body = (await response.json()) as unknown;

      if (!response.ok) {
        throw this.toAppError(
          this.isErrorResponse(body) ? body : undefined,
          response.status,
        );
      }

      if (!this.isChatResponse(body)) {
        throw new AppError(
          ErrorCode.DIFY_INVALID_RESPONSE,
          "Dify APIから想定外のレスポンス形式が返されました",
          502,
        );
      }

      return body;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(
        ErrorCode.DIFY_CONNECTION_FAILED,
        `Dify APIとの通信に失敗しました: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        502,
      );
    }
  }

  /**
   * ストリーミングモードのチャットメッセージ送信
   */
  async *streamMessage(
    request: DifyStreamRequest,
  ): AsyncGenerator<DifyStreamEvent> {
    const response = await fetch(this.buildUrl(CHAT_MESSAGES_ENDPOINT), {
      method: "POST",
      headers: this.createHeaders(),
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      let errorBody: unknown;
      try {
        errorBody = await response.json();
      } catch {
        /* noop - fallback to generic error */
      }
      throw this.toAppError(
        this.isErrorResponse(errorBody) ? errorBody : undefined,
        response.status,
      );
    }

    if (!response.body) {
      throw new AppError(
        ErrorCode.DIFY_INVALID_RESPONSE,
        "Dify APIからのストリーミングレスポンスが空でした",
        502,
      );
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split("\n\n");
      buffer = events.pop() ?? "";

      for (const eventChunk of events) {
        const dataLine = eventChunk
          .split("\n")
          .find((line) => line.startsWith("data:"));

        if (!dataLine) {
          continue;
        }

        const payload = dataLine.slice(5).trim();
        if (!payload || payload === "[DONE]") {
          continue;
        }

        try {
          const event = JSON.parse(payload) as DifyStreamEvent;
          yield event;
        } catch (error) {
          throw new AppError(
            ErrorCode.DIFY_INVALID_RESPONSE,
            `ストリーミングイベントの解析に失敗しました: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
            502,
          );
        }
      }
    }
  }

  private toAppError(
    body: DifyErrorResponse | undefined,
    status: number,
  ): AppError {
    if (body) {
      return new AppError(
        ErrorCode.DIFY_API_ERROR,
        `Dify API error (${body.code}): ${body.message}`,
        status,
      );
    }

    return new AppError(
      ErrorCode.DIFY_API_ERROR,
      `Dify API error: status ${status}`,
      status,
    );
  }

  private isErrorResponse(value: unknown): value is DifyErrorResponse {
    if (!value || typeof value !== "object") {
      return false;
    }
    return (
      "code" in value &&
      "message" in value &&
      "status" in value &&
      typeof (value as Record<string, unknown>).code === "string"
    );
  }

  private isChatResponse(value: unknown): value is DifyChatResponse {
    if (!value || typeof value !== "object") {
      return false;
    }
    return (
      "answer" in value &&
      "conversation_id" in value &&
      typeof (value as Record<string, unknown>).answer === "string"
    );
  }
}
