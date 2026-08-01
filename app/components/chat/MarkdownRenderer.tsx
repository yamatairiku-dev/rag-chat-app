import {
  useEffect,
  useMemo,
  useState,
  type ComponentPropsWithoutRef,
  type CSSProperties,
} from "react";
import ReactMarkdown from "react-markdown";
import type { ExtraProps } from "react-markdown";
import remarkGfm from "remark-gfm";

// シンタックスハイライト用のテーマを遅延ロード（初回のみ読み込み）
type SyntaxStyle = Record<string, CSSProperties>;

let vscDarkPlus: SyntaxStyle | null = null;
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
  typeof import("react-syntax-highlighter/dist/esm/prism-async-light").default;

let cachedHighlighter: SyntaxHighlighterType | null = null;
const loadHighlighter = async (): Promise<SyntaxHighlighterType> => {
  if (!cachedHighlighter) {
    const mod = await import(
      "react-syntax-highlighter/dist/esm/prism-async-light"
    );
    cachedHighlighter = mod.default;
  }
  return cachedHighlighter;
};

type MarkdownRendererProps = {
  content: string;
};

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const [style, setStyle] = useState<SyntaxStyle | null>(null);
  const [highlighter, setHighlighter] =
    useState<SyntaxHighlighterType | null>(null);

  useEffect(() => {
    // Vitestの環境破棄後に非同期モジュールが解決されるのを防ぐ。
    if (import.meta.env.MODE === "test") {
      return;
    }
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
      ({
        node: _node,
        inline,
        className,
        children,
        style: _codeStyle,
        ...props
      }: ComponentPropsWithoutRef<"code"> & ExtraProps & { inline?: boolean }) => {
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
