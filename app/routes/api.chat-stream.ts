// app/routes/api.chat-stream.ts
import { randomUUID } from "crypto";
import type { ActionFunctionArgs } from "react-router";
import { ensureValidToken } from "~/lib/session/token-refresh";
import { getSessionWithId } from "~/lib/session/session-manager";
import { appendConversationMessages } from "~/lib/chat/conversation-store.server";
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
      const initialConversationId =
        typeof conversationId === "string" ? conversationId : "";
      const userMessageId = randomUUID();
      const assistantMessageId = randomUUID();
      const startedAt = Date.now();

      const userMessage = {
        id: userMessageId,
        role: "user" as const,
        content: trimmedQuery,
        timestamp: startedAt,
      };

      let assistantContent = "";
      let assistantError: string | undefined;
      let assistantTimestamp = startedAt;
      let effectiveConversationId = initialConversationId;
      let shouldPersist = false;

      try {
        for await (const event of client.streamMessage({
          inputs: {
            user_id: session.userEmail,
            department_code: session.departmentCode,
          },
          query: trimmedQuery,
          response_mode: "streaming",
          conversation_id: initialConversationId,
          user: session.userEmail,
        })) {
          controller.enqueue(formatSse(event));
          assistantTimestamp = Date.now();

          if (event.event === "message") {
            assistantContent += event.answer ?? "";
            if (
              event.conversation_id &&
              event.conversation_id !== effectiveConversationId
            ) {
              effectiveConversationId = event.conversation_id;
            }
          } else if (event.event === "message_end") {
            if (
              event.conversation_id &&
              event.conversation_id !== effectiveConversationId
            ) {
              effectiveConversationId = event.conversation_id;
            }
          } else if (event.event === "error") {
            assistantError =
              typeof event.message === "string"
                ? event.message
                : "メッセージ送信に失敗しました。";
          }
        }

        controller.enqueue(formatSse({ event: "done" }));
        controller.close();
        shouldPersist = true;
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

        assistantError = message;
        shouldPersist = true;
      }

      if (!shouldPersist) {
        return;
      }

      const resolvedConversationId = effectiveConversationId;
      const assistantPayload =
        assistantError ?? assistantContent;

      if (!resolvedConversationId || !assistantPayload) {
        return;
      }

      await appendConversationMessages({
        conversationId: resolvedConversationId,
        userId: session.userId,
        departmentCode: session.departmentCode,
        messages: [
          userMessage,
          {
            id: assistantMessageId,
            role: "assistant",
            content: assistantPayload,
            timestamp: assistantTimestamp,
            error: assistantError,
          },
        ],
      });
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
