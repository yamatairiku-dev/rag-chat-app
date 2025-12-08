import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Input } from "~/components/ui/input";

describe("Input", () => {
  it("正常系: Inputコンポーネントがレンダリングされる", () => {
    render(<Input data-testid="input" />);
    expect(screen.getByTestId("input")).toBeInTheDocument();
  });

  it("正常系: type属性が適用される", () => {
    render(<Input type="email" data-testid="input" />);
    const input = screen.getByTestId("input");
    expect(input).toHaveAttribute("type", "email");
  });

  it("正常系: placeholderが表示される", () => {
    render(<Input placeholder="メールアドレスを入力" />);
    expect(screen.getByPlaceholderText("メールアドレスを入力")).toBeInTheDocument();
  });

  it("正常系: valueが設定される", () => {
    render(<Input value="test@example.com" readOnly />);
    const input = screen.getByDisplayValue("test@example.com");
    expect(input).toBeInTheDocument();
  });

  it("正常系: disabled属性が適用される", () => {
    render(<Input disabled data-testid="input" />);
    const input = screen.getByTestId("input");
    expect(input).toBeDisabled();
  });

  it("正常系: classNameが適用される", () => {
    const { container } = render(<Input className="custom-input" />);
    const input = container.querySelector('[data-slot="input"]');
    expect(input).toHaveClass("custom-input");
  });

  it("正常系: 追加のpropsが渡される", () => {
    render(<Input name="email" id="email-input" data-testid="input" />);
    const input = screen.getByTestId("input");
    expect(input).toHaveAttribute("name", "email");
    expect(input).toHaveAttribute("id", "email-input");
  });

  it("正常系: type属性なしでもレンダリングされる", () => {
    render(<Input data-testid="input" />);
    const input = screen.getByTestId("input");
    expect(input).toBeInTheDocument();
  });
});

