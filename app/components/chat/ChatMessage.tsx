import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import type { Message } from "~/types/chat";
import { useState, useEffect } from "react";

// スタイルを動的にインポート（Code Splitting）
let vscDarkPlus: any = null;
const loadStyle = async () => {
  if (!vscDarkPlus) {
    const styleModule = await import(
      "react-syntax-highlighter/dist/esm/styles/prism/vsc-dark-plus"
    );
    vscDarkPlus = styleModule.default;
  }
  return vscDarkPlus;
};

interface ChatMessageProps {
  message: Message;
  onRetry?: (query: string) => void;
}

export function ChatMessage({ message, onRetry }: ChatMessageProps) {
  const isUser = message.role === "user";
  const [style, setStyle] = useState<any>(null);

  useEffect(() => {
    // コードブロックがある場合のみスタイルをロード
    if (message.content.includes("```")) {
      loadStyle().then(setStyle);
    }
  }, [message.content]);

  const createCodeComponent = () => {
    return ({ node, inline, className, children, ...props }: any) => {
      if (inline) {
        return (
          <code className={className} {...props}>
            {children}
          </code>
        );
      }
      const match = /language-(\w+)/.exec(className || "");
      if (!match || !style) {
        return (
          <code className={className} {...props}>
            {children}
          </code>
        );
      }
      return (
        <SyntaxHighlighter
          style={style}
          language={match[1]}
          PreTag="div"
          {...props}
        >
          {String(children).replace(/\n$/, "")}
        </SyntaxHighlighter>
      );
    };
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
        <div className="whitespace-pre-wrap leading-relaxed">
          {message.role === "assistant" && message.isStreaming ? (
            <>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code: createCodeComponent(),
                }}
              >
                {message.content || ""}
              </ReactMarkdown>
              <span className="ml-1 animate-pulse" aria-label="入力中" aria-live="polite">▋</span>
            </>
          ) : (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code: createCodeComponent(),
              }}
            >
              {message.content}
            </ReactMarkdown>
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

