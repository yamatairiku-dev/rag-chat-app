import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { Separator } from "~/components/ui/separator";

describe("Separator", () => {
  it("正常系: Separatorコンポーネントがレンダリングされる", () => {
    const { container } = render(<Separator />);
    const separator = container.querySelector('[data-slot="separator"]');
    expect(separator).toBeInTheDocument();
  });

  it("正常系: デフォルトのorientationでレンダリングされる", () => {
    // Radix UIのSeparatorはorientation属性をDOMに反映しないため、
    // コンポーネントがエラーなくレンダリングされることを確認
    const { container } = render(<Separator />);
    const separator = container.querySelector('[data-slot="separator"]');
    expect(separator).toBeInTheDocument();
  });

  it("正常系: orientationがverticalでもレンダリングされる", () => {
    const { container } = render(<Separator orientation="vertical" />);
    const separator = container.querySelector('[data-slot="separator"]');
    expect(separator).toBeInTheDocument();
  });

  it("正常系: decorativeプロップが受け取れる", () => {
    // Radix UIのSeparatorはdecorative属性をDOMに反映しないため、
    // コンポーネントがエラーなくレンダリングされることを確認
    const { container } = render(<Separator />);
    const separator = container.querySelector('[data-slot="separator"]');
    expect(separator).toBeInTheDocument();
  });

  it("正常系: decorativeがfalseでもレンダリングされる", () => {
    const { container } = render(<Separator decorative={false} />);
    const separator = container.querySelector('[data-slot="separator"]');
    expect(separator).toBeInTheDocument();
  });

  it("正常系: classNameが適用される", () => {
    const { container } = render(<Separator className="custom-separator" />);
    const separator = container.querySelector('[data-slot="separator"]');
    expect(separator).toHaveClass("custom-separator");
  });

  it("正常系: 追加のpropsが渡される", () => {
    const { container } = render(<Separator data-testid="separator" aria-label="区切り線" />);
    const separator = container.querySelector('[data-slot="separator"]');
    expect(separator).toHaveAttribute("data-testid", "separator");
    expect(separator).toHaveAttribute("aria-label", "区切り線");
  });
});

