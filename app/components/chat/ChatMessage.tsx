import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
// @ts-expect-error - react-syntax-highlighterの型定義の問題
import vscDarkPlus from "react-syntax-highlighter/dist/esm/styles/prism/vsc-dark-plus";
import type { Message } from "~/types/chat";

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={`mb-4 flex ${
        isUser ? "justify-end" : "justify-start"
      }`}
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
                  code({ node, inline, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || "");
                    return !inline && match ? (
                      <SyntaxHighlighter
                        style={vscDarkPlus}
                        language={match[1]}
                        PreTag="div"
                        {...props}
                      >
                        {String(children).replace(/\n$/, "")}
                      </SyntaxHighlighter>
                    ) : (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {message.content || ""}
              </ReactMarkdown>
              <span className="ml-1 animate-pulse">▋</span>
            </>
          ) : (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ node, inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || "");
                  return !inline && match ? (
                    <SyntaxHighlighter
                      style={vscDarkPlus}
                      language={match[1]}
                      PreTag="div"
                      {...props}
                    >
                      {String(children).replace(/\n$/, "")}
                    </SyntaxHighlighter>
                  ) : (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
          )}
        </div>
        {message.error && (
          <p
            className={`mt-2 text-xs ${
              isUser ? "text-red-200" : "text-red-500"
            }`}
          >
            {message.error}
          </p>
        )}
      </div>
    </div>
  );
}

