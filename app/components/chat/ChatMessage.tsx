import type { Message } from "~/types/chat";
import { Suspense, lazy } from "react";

const MarkdownRenderer = lazy(() => import("./MarkdownRenderer"));

interface ChatMessageProps {
  message: Message;
  onRetry?: (query: string) => void;
}

export function ChatMessage({ message, onRetry }: ChatMessageProps) {
  const isUser = message.role === "user";

  // メッセージの先頭と末尾の空行を削除し、連続する空行を1つにまとめる
  const normalizeContent = (content: string): string => {
    return content
      .replace(/^\n+/, "") // 先頭の改行を削除
      .replace(/\n+$/, "") // 末尾の改行を削除
      .replace(/\n{3,}/g, "\n\n"); // 3つ以上の連続する改行を2つに統一
  };

  return (
    <div
      className={`mb-4 flex ${
        isUser ? "justify-end" : "justify-start"
      }`}
      role="article"
      aria-label={isUser ? "ユーザーメッセージ" : "アシスタントメッセージ"}
    >
      <div
        className={`max-w-[80%] rounded-lg px-4 py-3 text-sm shadow ${
          isUser
            ? "bg-blue-600 text-white"
            : "bg-gray-100 text-gray-800"
        }`}
      >
        <div className="leading-relaxed">
          {message.role === "assistant" && message.isStreaming ? (
            <>
              <Suspense
                fallback={
                  <span className="text-xs text-gray-400">読み込み中…</span>
                }
              >
                <MarkdownRenderer
                  content={normalizeContent(message.content || "")}
                />
              </Suspense>
              <span className="ml-1 animate-pulse" aria-label="入力中" aria-live="polite">▋</span>
            </>
          ) : (
            <Suspense
              fallback={
                <span className="text-xs text-gray-400">読み込み中…</span>
              }
            >
              <MarkdownRenderer content={normalizeContent(message.content)} />
            </Suspense>
          )}
        </div>
        {message.error && (
          <div className="mt-2">
            <p
              className={`text-xs ${
                isUser ? "text-red-200" : "text-red-500"
              }`}
              role="alert"
              aria-live="polite"
            >
              {message.error}
            </p>
            {message.retryQuery && onRetry && message.role === "assistant" && (
              <button
                onClick={() => onRetry(message.retryQuery!)}
                className={`mt-2 rounded px-3 py-1 text-xs font-medium transition ${
                  isUser
                    ? "bg-red-500 text-white hover:bg-red-600"
                    : "bg-red-100 text-red-700 hover:bg-red-200"
                }`}
                aria-label="再試行"
              >
                再試行
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

