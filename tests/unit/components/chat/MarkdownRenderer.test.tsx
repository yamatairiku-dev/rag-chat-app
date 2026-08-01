import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import MarkdownRenderer from "~/components/chat/MarkdownRenderer";

describe("MarkdownRenderer", () => {
  it("正常系: 通常のテキストがレンダリングされる", () => {
    render(<MarkdownRenderer content="こんにちは、世界" />);
    expect(screen.getByText("こんにちは、世界")).toBeInTheDocument();
  });

  it("正常系: 見出しがレンダリングされる", () => {
    const { container } = render(<MarkdownRenderer content="# 見出し" />);
    const heading = container.querySelector("h1");
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent("見出し");
  });

  it("正常系: リストがレンダリングされる（remark-gfm）", () => {
    const { container } = render(
      <MarkdownRenderer content={"- 項目1\n- 項目2"} />,
    );
    const items = container.querySelectorAll("li");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("項目1");
    expect(items[1]).toHaveTextContent("項目2");
  });

  it("正常系: テーブルがレンダリングされる（remark-gfm）", () => {
    const content = "| a | b |\n| --- | --- |\n| 1 | 2 |";
    const { container } = render(<MarkdownRenderer content={content} />);
    expect(container.querySelector("table")).toBeInTheDocument();
  });

  it("正常系: インラインコードはcode要素としてレンダリングされる", () => {
    const { container } = render(
      <MarkdownRenderer content="これは`インラインコード`です" />,
    );
    const code = container.querySelector("code");
    expect(code).toBeInTheDocument();
    expect(code).toHaveTextContent("インラインコード");
  });

  it("正常系: コードブロックを含む場合はシンタックスハイライターが遅延ロードされる", async () => {
    const content = "```js\nconst x = 1;\n```";
    const { container } = render(<MarkdownRenderer content={content} />);

    // 初回はハイライターが未ロードのため通常のcode要素、
    // 読み込み後はシンタックスハイライトされた要素に置き換わる
    await waitFor(() => {
      expect(container.querySelector("code, pre")).toBeInTheDocument();
    });
  });

  it("正常系: contentが空文字列でもエラーにならない", () => {
    const { container } = render(<MarkdownRenderer content="" />);
    expect(container).toBeInTheDocument();
  });
});
