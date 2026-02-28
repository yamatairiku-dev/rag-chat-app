import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// シンタックスハイライト用のテーマを遅延ロード（初回のみ読み込み）
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

type SyntaxHighlighterType =
  typeof import("react-syntax-highlighter")["Prism"];

let cachedHighlighter: SyntaxHighlighterType | null = null;
const loadHighlighter = async (): Promise<SyntaxHighlighterType> => {
  if (!cachedHighlighter) {
    const mod = await import("react-syntax-highlighter");
    cachedHighlighter = mod.Prism;
  }
  return cachedHighlighter;
};

type MarkdownRendererProps = {
  content: string;
};

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const [style, setStyle] = useState<any>(null);
  const [highlighter, setHighlighter] =
    useState<SyntaxHighlighterType | null>(null);

  useEffect(() => {
    if (content.includes("```")) {
      const load = async () => {
        const [loadedStyle, loadedHighlighter] = await Promise.all([
          loadStyle(),
          loadHighlighter(),
        ]);
        setStyle(loadedStyle);
        setHighlighter(() => loadedHighlighter);
      };
      void load();
    }
  }, [content]);

  const CodeComponent = useMemo(
    () =>
      ({ node, inline, className, children, ...props }: any) => {
        if (inline) {
          return (
            <code className={className} {...props}>
              {children}
            </code>
          );
        }
        const match = /language-(\w+)/.exec(className || "");
        if (!match || !style || !highlighter) {
          return (
            <code className={className} {...props}>
              {children}
            </code>
          );
        }
        const HighlighterComponent = highlighter;
        return (
          <HighlighterComponent
            style={style}
            language={match[1]}
            PreTag="div"
            {...props}
          >
            {String(children).replace(/\n$/, "")}
          </HighlighterComponent>
        );
      },
    [style, highlighter]
  );

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code: CodeComponent,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

