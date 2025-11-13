// app/routes/api.chat-stream.ts
import type { ActionFunctionArgs } from "react-router";
import { ensureValidToken } from "~/lib/session/token-refresh";
import { getSessionWithId } from "~/lib/session/session-manager";
import { DifyClient } from "~/lib/dify/client";
import { env } from "~/lib/utils/env";
import { AppError, ErrorCode } from "~/types/error";

const encoder = new TextEncoder();

function formatSse(event: unknown): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(event)}\n\n`);
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return new Response(null, { status: 405 });
  }

  const sessionResult = await getSessionWithId(request);
  if (!sessionResult) {
    return new Response(null, { status: 401 });
  }

  let { session, sessionId } = sessionResult;

  try {
    session = await ensureValidToken(sessionId, session);
  } catch (error) {
    if (error instanceof AppError && error.code === ErrorCode.AUTH_TOKEN_EXPIRED) {
      return new Response(null, { status: 401 });
    }
    throw error;
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON payload" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  if (
    !payload ||
    typeof payload !== "object" ||
    Array.isArray(payload)
  ) {
    return new Response(
      JSON.stringify({ error: "Invalid request body" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const { query, conversationId } = payload as {
    query?: unknown;
    conversationId?: unknown;
  };

  if (typeof query !== "string" || !query.trim()) {
    return new Response(
      JSON.stringify({ error: "メッセージを入力してください。" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const trimmedQuery = query.trim();
  if (trimmedQuery.length > env.MAX_MESSAGE_LENGTH) {
    return new Response(
      JSON.stringify({
        error: `メッセージが長すぎます（最大 ${env.MAX_MESSAGE_LENGTH} 文字）。`,
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const client = new DifyClient();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of client.streamMessage({
          inputs: {
            user_id: session.userEmail,
            department_code: session.departmentCode,
          },
          query: trimmedQuery,
          response_mode: "streaming",
          conversation_id:
            typeof conversationId === "string" ? conversationId : "",
          user: session.userEmail,
        })) {
          controller.enqueue(formatSse(event));
        }
        controller.enqueue(formatSse({ event: "done" }));
        controller.close();
      } catch (error) {
        const message =
          error instanceof AppError
            ? error.message
            : error instanceof Error
              ? error.message
              : "ストリーミングに失敗しました";

        const payload = {
          event: "error",
          message,
          code: error instanceof AppError ? error.code : undefined,
        };

        try {
          controller.enqueue(formatSse(payload));
        } finally {
          controller.close();
        }
      }
    },
    cancel() {
      // Nothing to clean up currently.
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
