// app/routes/chat.tsx
import { randomUUID } from "crypto";
import { useEffect, useRef, useState } from "react";
import type { Route } from "./+types/chat";
import { Form, redirect, useLoaderData } from "react-router";
import type { Message } from "~/types/chat";
import { ensureValidToken } from "~/lib/session/token-refresh";
import {
  getSessionWithId,
  requireUserSession,
} from "~/lib/session/session-manager";
import { AppError, ErrorCode } from "~/types/error";
import { DifyClient } from "~/lib/dify/client";
import { env } from "~/lib/utils/env";
import { ConversationManager } from "~/lib/chat/conversation-manager";
import { getConversation } from "~/lib/chat/conversation-store.server";
import { Header } from "~/components/layout/Header";
import { ChatMessage } from "~/components/chat/ChatMessage";
import { logger } from "~/lib/logging/logger";

type LoaderData = {
  user: {
    displayName: string;
    userEmail: string;
    departmentCode: string;
    departmentName?: string;
  };
  conversationId?: string;
  initialMessages?: Message[];
};

type ActionSuccess = {
  success: true;
  answer: string;
  conversationId: string;
  messageId: string;
};

type ActionError = {
  success: false;
  error: string;
  errorId: string;
};

type ActionData = ActionSuccess | ActionError;

export async function loader({ request }: Route.LoaderArgs) {
  try {
    const result = await getSessionWithId(request);

    if (!result) {
      return redirect("/auth/login");
    }

    const { session, sessionId } = result;

    try {
      await ensureValidToken(sessionId, session);
    } catch (error) {
      if (error instanceof AppError && error.code === ErrorCode.AUTH_TOKEN_EXPIRED) {
        return redirect("/auth/login");
      }
    }

    const url = new URL(request.url);
    const conversationId = url.searchParams.get("conversationId") ?? undefined;

    let initialMessages: Message[] | undefined;

    if (conversationId) {
      const existing = await getConversation(conversationId);
      if (existing && existing.userId === session.userId) {
        initialMessages = existing.messages.map((message) => ({
          id: message.id,
          conversationId: existing.conversationId,
          role: message.role,
          content: message.content,
          timestamp: message.timestamp,
          isStreaming: false,
          isComplete: true,
          error: message.error,
        }));
      }
    }

    return Response.json<LoaderData>({
      user: {
        displayName: session.displayName,
        userEmail: session.userEmail,
        departmentCode: session.departmentCode,
        departmentName: session.departmentName,
      },
      conversationId,
      initialMessages,
    });
  } catch (error) {
    logger.error("セッション取得エラー", { error });
    return redirect("/auth/login");
  }
}

export async function action({ request }: Route.ActionArgs) {
  const session = await requireUserSession(request);
  const formData = await request.formData();

  const rawQuery = (formData.get("query") as string | null) ?? "";
  const conversationId = ((formData.get("conversation_id") as string | null) ?? "").trim();
  const trimmedQuery = rawQuery.trim();

  if (!trimmedQuery) {
    return Response.json(
      {
        success: false,
        error: "メッセージを入力してください。",
        errorId: randomUUID(),
      },
      { status: 400 },
    );
  }

  if (trimmedQuery.length > env.MAX_MESSAGE_LENGTH) {
    return Response.json(
      {
        success: false,
        error: `メッセージが長すぎます（最大 ${env.MAX_MESSAGE_LENGTH} 文字）。`,
        errorId: randomUUID(),
      },
      { status: 400 },
    );
  }

  const client = new DifyClient();

  try {
    const response = await client.sendMessage({
      inputs: {
        user_id: session.userEmail,
        department_code: session.departmentCode,
      },
      query: trimmedQuery,
      response_mode: "blocking",
      conversation_id: conversationId || "",
      user: session.userEmail,
    });

    return Response.json({
      success: true,
      answer: response.answer,
      conversationId: response.conversation_id,
      messageId: response.message_id,
    });
  } catch (error) {
    logger.error("Dify API呼び出しエラー", { error });

    const message =
      error instanceof AppError
        ? error.message
        : "メッセージ送信に失敗しました。時間をおいて再度お試しください。";

    const status =
      error instanceof AppError ? error.statusCode : 500;

    return Response.json(
      {
        success: false,
        error: message,
        errorId: randomUUID(),
      },
      { status },
    );
  }
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "チャット - 社内RAG検索チャットボット" },
    {
      name: "description",
      content: "社内規則・マニュアルを検索できるチャットボット",
    },
  ];
}

export default function Chat() {
  const { user, initialMessages, conversationId: loaderConversationId } =
    useLoaderData<LoaderData>();
  const [messages, setMessages] = useState<Message[]>(
    () => initialMessages ?? [],
  );
  const [conversationId, setConversationId] = useState<string>(
    loaderConversationId ?? "",
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (loaderConversationId) {
      ConversationManager.setConversationId(loaderConversationId);
      return;
    }

    const storedId = ConversationManager.getConversationId();
    if (storedId) {
      setConversationId(storedId);
    }
  }, [loaderConversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const startStreaming = async (query: string) => {
    if (isStreaming) {
      setFormError("前の応答の受信が完了するまでお待ちください。");
      return;
    }

    const now = Date.now();
    const userMessageId = `user-${now}`;
    const assistantMessageId = `assistant-${now}`;
    const provisionalConversationId =
      conversationId || `pending-${now}`;

    const timestamp = Date.now();

    setMessages((prev) => [
      ...prev,
      {
        id: userMessageId,
        conversationId: conversationId || provisionalConversationId,
        role: "user",
        content: query,
        timestamp,
        isComplete: true,
      },
      {
        id: assistantMessageId,
        conversationId: conversationId || provisionalConversationId,
        role: "assistant",
        content: "",
        timestamp,
        isStreaming: true,
      },
    ]);

    formRef.current?.reset();
    setFormError(null);
    setIsStreaming(true);

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const applyConversationId = (nextId: string) => {
      setConversationId(nextId);
      ConversationManager.setConversationId(nextId);
      setMessages((prev) =>
        prev.map((message) =>
          message.id === assistantMessageId || message.id === userMessageId
            ? { ...message, conversationId: nextId }
            : message,
        ),
      );
    };

    try {
      const response = await fetch("/api/chat-stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          conversationId,
        }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        const errorPayload = await response.json().catch(() => null);
        const message =
          errorPayload && typeof errorPayload === "object" && "error" in errorPayload
            ? (errorPayload as { error: string }).error
            : `メッセージ送信に失敗しました (status ${response.status})`;
        throw new Error(message);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      let aggregatedAnswer = "";
      let effectiveConversationId = conversationId;
      let finished = false;

      while (true) {
        const { value, done } = await reader.read();
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

          const payloadText = dataLine.slice(5).trim();
          if (!payloadText || payloadText === "[DONE]") {
            continue;
          }

          let payload: any;
          try {
            payload = JSON.parse(payloadText);
          } catch {
            continue;
          }

          if (payload.event === "message") {
            aggregatedAnswer += payload.answer ?? "";
            setMessages((prev) =>
              prev.map((message) =>
                message.id === assistantMessageId
                  ? {
                      ...message,
                      content: aggregatedAnswer,
                      isStreaming: true,
                    }
                  : message,
              ),
            );

            if (
              payload.conversation_id &&
              payload.conversation_id !== effectiveConversationId
            ) {
              effectiveConversationId = payload.conversation_id;
              applyConversationId(payload.conversation_id);
            }
          } else if (payload.event === "message_end") {
            finished = true;
            if (
              payload.conversation_id &&
              payload.conversation_id !== effectiveConversationId
            ) {
              effectiveConversationId = payload.conversation_id;
              applyConversationId(payload.conversation_id);
            }
            setMessages((prev) =>
              prev.map((message) =>
                message.id === assistantMessageId
                  ? {
                      ...message,
                      isStreaming: false,
                      isComplete: true,
                    }
                  : message,
              ),
            );
          } else if (payload.event === "error") {
            const errorMessage =
              typeof payload.message === "string"
                ? payload.message
                : "メッセージ送信に失敗しました。";
            setMessages((prev) =>
              prev.map((message) =>
                message.id === assistantMessageId
                  ? {
                      ...message,
                      content: errorMessage,
                      isStreaming: false,
                      isComplete: true,
                      error: errorMessage,
                    }
                  : message,
              ),
            );
            setFormError(errorMessage);
            finished = true;
          } else if (payload.event === "done") {
            finished = true;
            setMessages((prev) =>
              prev.map((message) =>
                message.id === assistantMessageId
                  ? {
                      ...message,
                      isStreaming: false,
                      isComplete: true,
                    }
                  : message,
              ),
            );
          }
        }
      }

      if (!finished) {
        setMessages((prev) =>
          prev.map((message) =>
            message.id === assistantMessageId
              ? {
                  ...message,
                  isStreaming: false,
                  isComplete: true,
                }
              : message,
          ),
        );
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        const message =
          error instanceof Error
            ? error.message
            : "メッセージ送信に失敗しました。";

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? {
                  ...msg,
                  content: message,
                  isStreaming: false,
                  isComplete: true,
                  error: message,
                }
              : msg,
          ),
        );
        setFormError(message);
      }
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      setIsStreaming(false);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const query = (formData.get("query") as string | null) ?? "";
    const trimmed = query.trim();

    if (!trimmed) {
      setFormError("メッセージを入力してください。");
      return;
    }

    setFormError(null);

    void startStreaming(trimmed);
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Header user={user} errorMessage={formError} />
      <main className="container mx-auto flex w-full flex-1 flex-col px-4 py-6">
        <div className="flex-1 overflow-y-auto rounded-lg bg-white p-6 shadow">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-gray-400">
              最初の質問を入力してください。
            </div>
          ) : (
            messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="mt-4 rounded-lg bg-white p-4 shadow">
          <Form
            ref={formRef}
            method="post"
            className="flex flex-col gap-3 md:flex-row"
            onSubmit={handleSubmit}
          >
            <input
              type="hidden"
              name="conversation_id"
              value={conversationId}
            />
            <textarea
              name="query"
              rows={2}
              className="w-full resize-none rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="社内規則やマニュアルについて質問してください…"
              disabled={isStreaming}
            />
            <button
              type="submit"
              className="rounded bg-blue-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isStreaming}
            >
              {isStreaming ? "送信中…" : "送信"}
            </button>
          </Form>
        </div>
      </main>
    </div>
  );
}
