// app/lib/graph/graph-client.ts
import { Client } from '@microsoft/microsoft-graph-client';
import { logger } from '~/lib/logging/logger';

/**
 * Graph APIクライアント作成
 */
export function createGraphClient(accessToken: string): Client {
  return Client.init({
    authProvider: (done) => {
      done(null, accessToken);
    },
  });
}

const GRAPH_MAX_RETRIES = 2;
const GRAPH_RETRY_BASE_DELAY_MS = 500;

function isRetryableGraphError(error: unknown): boolean {
  const statusCode = (error as { statusCode?: number } | null | undefined)?.statusCode;
  // statusCodeが取得できないエラー（ネットワークエラー等）は再試行対象、
  // 4xxのようなクライアントエラーは再試行しない
  return typeof statusCode !== 'number' || statusCode >= 500;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Graph API呼び出しの自動リトライラッパー
 *
 * 5xx・ネットワークエラーのみ再試行し、4xx等のクライアントエラーは即座に投げる
 */
export async function withGraphRetry<T>(operation: () => Promise<T>): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= GRAPH_MAX_RETRIES; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < GRAPH_MAX_RETRIES && isRetryableGraphError(error)) {
        logger.debug(`[GraphClient] リトライ試行 ${attempt + 1}/${GRAPH_MAX_RETRIES}`, {
          error: error instanceof Error ? error.message : String(error),
        });
        await delay(GRAPH_RETRY_BASE_DELAY_MS * (attempt + 1));
        continue;
      }
      throw error;
    }
  }

  throw lastError;
}

