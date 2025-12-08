import type {
  DifyChatRequest,
  DifyChatResponse,
  DifyErrorResponse,
  DifyStreamEvent,
  DifyStreamRequest,
} from "~/types/dify";
import { env } from "~/lib/utils/env";
import { AppError, ErrorCode } from "~/types/error";
import { logger } from "~/lib/logging/logger";

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
   * ブロッキングモードのチャットメッセージ送信（自動リトライ付き）
   */
  async sendMessage(request: DifyChatRequest): Promise<DifyChatResponse> {
    const maxRetries = env.DIFY_MAX_RETRIES;
    let lastError: Error | AppError | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(this.buildUrl(CHAT_MESSAGES_ENDPOINT), {
          method: "POST",
          headers: this.createHeaders(),
          body: JSON.stringify(request),
          signal: AbortSignal.timeout(env.DIFY_TIMEOUT),
        });

        const body = (await response.json()) as unknown;

        if (!response.ok) {
          const error = this.toAppError(
            this.isErrorResponse(body) ? body : undefined,
            response.status,
          );
          
          // 4xxエラー（クライアントエラー）はリトライしない
          if (response.status >= 400 && response.status < 500) {
            throw error;
          }
          
          // 5xxエラー（サーバーエラー）はリトライ可能
          lastError = error;
          if (attempt < maxRetries) {
            await this.delay(1000 * (attempt + 1)); // 指数バックオフ
            continue;
          }
          throw error;
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
          // 4xxエラーはリトライしない
          if (error.statusCode >= 400 && error.statusCode < 500) {
            throw error;
          }
          
          lastError = error;
          if (attempt < maxRetries) {
            await this.delay(1000 * (attempt + 1)); // 指数バックオフ
            continue;
          }
          throw error;
        }

        // ネットワークエラーやタイムアウトはリトライ可能
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < maxRetries) {
          logger.debug(`[DifyClient] リトライ試行 ${attempt + 1}/${maxRetries}`, { error: lastError.message });
          await this.delay(1000 * (attempt + 1)); // 指数バックオフ
          continue;
        }
      }
    }

    // すべてのリトライが失敗した場合
    throw new AppError(
      ErrorCode.DIFY_CONNECTION_FAILED,
      `Dify APIとの通信に失敗しました（${maxRetries + 1}回試行）: ${
        lastError instanceof Error ? lastError.message : "Unknown error"
      }`,
      502,
    );
  }

  /**
   * リトライ用の遅延関数
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * ストリーミングモードのチャットメッセージ送信
   */
  async *streamMessage(
    request: DifyStreamRequest,
  ): AsyncGenerator<DifyStreamEvent> {
    const url = this.buildUrl(CHAT_MESSAGES_ENDPOINT);
    const headers = this.createHeaders();
    const body = JSON.stringify(request);

    logger.debug("Dify API request", {
      url,
      method: "POST",
      headers: {
        ...headers,
        Authorization: headers.Authorization ? "Bearer ***" : undefined,
      },
      body: request,
    });

    const response = await fetch(url, {
      method: "POST",
      headers,
      body,
    });

    if (!response.ok) {
      let errorBody: unknown;
      try {
        errorBody = await response.json();
        logger.error("Dify API error response", {
          status: response.status,
          statusText: response.statusText,
          url,
          errorBody,
        });
      } catch (parseError) {
        logger.error("Dify API error (failed to parse response)", {
          status: response.status,
          statusText: response.statusText,
          url,
          parseError: parseError instanceof Error ? parseError.message : String(parseError),
        });
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
      logger.error("Dify API error details", {
        code: body.code,
        message: body.message,
        status: body.status,
        httpStatus: status,
      });
      return new AppError(
        ErrorCode.DIFY_API_ERROR,
        `Dify API error (${body.code}): ${body.message}`,
        status,
      );
    }

    logger.error("Dify API error (no error body)", {
      httpStatus: status,
    });
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
