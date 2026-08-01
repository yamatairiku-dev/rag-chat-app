import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { Button } from "~/components/ui/button";

describe("Button", () => {
  it("正常系: Buttonコンポーネントがレンダリングされる", () => {
    const { container } = render(<Button>送信</Button>);
    const button = container.querySelector('[data-slot="button"]');
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent("送信");
  });

  it("正常系: デフォルトでbutton要素としてレンダリングされる", () => {
    const { container } = render(<Button>送信</Button>);
    const button = container.querySelector("button[data-slot=\"button\"]");
    expect(button).toBeInTheDocument();
  });

  it("正常系: classNameが適用される", () => {
    const { container } = render(<Button className="custom-button">送信</Button>);
    const button = container.querySelector('[data-slot="button"]');
    expect(button).toHaveClass("custom-button");
  });

  it("正常系: variantに応じたクラスが適用される（destructive）", () => {
    const { container } = render(<Button variant="destructive">削除</Button>);
    const button = container.querySelector('[data-slot="button"]');
    expect(button).toHaveClass("bg-destructive");
  });

  it("正常系: sizeに応じたクラスが適用される（sm）", () => {
    const { container } = render(<Button size="sm">送信</Button>);
    const button = container.querySelector('[data-slot="button"]');
    expect(button).toHaveClass("h-8");
  });

  it("正常系: asChildがtrueの場合、子要素として（button以外を）レンダリングする", () => {
    const { container } = render(
      <Button asChild>
        <a href="/chat">チャットへ</a>
      </Button>,
    );
    const anchor = container.querySelector('a[data-slot="button"]');
    expect(anchor).toBeInTheDocument();
    expect(anchor).toHaveAttribute("href", "/chat");
    expect(container.querySelector("button")).not.toBeInTheDocument();
  });

  it("正常系: disabledが渡された場合、無効化される", () => {
    const { container } = render(<Button disabled>送信</Button>);
    const button = container.querySelector('[data-slot="button"]');
    expect(button).toBeDisabled();
  });

  it("正常系: 追加のpropsが渡される（type, aria-label）", () => {
    const { container } = render(
      <Button type="submit" aria-label="送信ボタン">
        送信
      </Button>,
    );
    const button = container.querySelector('[data-slot="button"]');
    expect(button).toHaveAttribute("type", "submit");
    expect(button).toHaveAttribute("aria-label", "送信ボタン");
  });
});
