import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardAction,
} from "~/components/ui/card";

describe("Card components", () => {
  describe("Card", () => {
    it("正常系: Cardコンポーネントがレンダリングされる", () => {
      render(<Card data-testid="card">テストコンテンツ</Card>);
      expect(screen.getByTestId("card")).toBeInTheDocument();
      expect(screen.getByText("テストコンテンツ")).toBeInTheDocument();
    });

    it("正常系: classNameが適用される", () => {
      const { container } = render(<Card className="custom-class" />);
      const card = container.querySelector('[data-slot="card"]');
      expect(card).toHaveClass("custom-class");
    });

    it("正常系: 追加のpropsが渡される", () => {
      render(<Card data-testid="card" aria-label="カード" />);
      expect(screen.getByTestId("card")).toHaveAttribute("aria-label", "カード");
    });
  });

  describe("CardHeader", () => {
    it("正常系: CardHeaderがレンダリングされる", () => {
      render(<CardHeader>ヘッダーコンテンツ</CardHeader>);
      expect(screen.getByText("ヘッダーコンテンツ")).toBeInTheDocument();
    });

    it("正常系: classNameが適用される", () => {
      const { container } = render(<CardHeader className="custom-header" />);
      const header = container.querySelector('[data-slot="card-header"]');
      expect(header).toHaveClass("custom-header");
    });
  });

  describe("CardTitle", () => {
    it("正常系: CardTitleがレンダリングされる", () => {
      render(<CardTitle>タイトル</CardTitle>);
      expect(screen.getByText("タイトル")).toBeInTheDocument();
    });

    it("正常系: classNameが適用される", () => {
      const { container } = render(<CardTitle className="custom-title" />);
      const title = container.querySelector('[data-slot="card-title"]');
      expect(title).toHaveClass("custom-title");
    });
  });

  describe("CardDescription", () => {
    it("正常系: CardDescriptionがレンダリングされる", () => {
      render(<CardDescription>説明文</CardDescription>);
      expect(screen.getByText("説明文")).toBeInTheDocument();
    });

    it("正常系: classNameが適用される", () => {
      const { container } = render(<CardDescription className="custom-desc" />);
      const desc = container.querySelector('[data-slot="card-description"]');
      expect(desc).toHaveClass("custom-desc");
    });
  });

  describe("CardContent", () => {
    it("正常系: CardContentがレンダリングされる", () => {
      render(<CardContent>コンテンツ</CardContent>);
      expect(screen.getByText("コンテンツ")).toBeInTheDocument();
    });

    it("正常系: classNameが適用される", () => {
      const { container } = render(<CardContent className="custom-content" />);
      const content = container.querySelector('[data-slot="card-content"]');
      expect(content).toHaveClass("custom-content");
    });
  });

  describe("CardFooter", () => {
    it("正常系: CardFooterがレンダリングされる", () => {
      render(<CardFooter>フッター</CardFooter>);
      expect(screen.getByText("フッター")).toBeInTheDocument();
    });

    it("正常系: classNameが適用される", () => {
      const { container } = render(<CardFooter className="custom-footer" />);
      const footer = container.querySelector('[data-slot="card-footer"]');
      expect(footer).toHaveClass("custom-footer");
    });
  });

  describe("CardAction", () => {
    it("正常系: CardActionがレンダリングされる", () => {
      render(<CardAction>アクション</CardAction>);
      expect(screen.getByText("アクション")).toBeInTheDocument();
    });

    it("正常系: classNameが適用される", () => {
      const { container } = render(<CardAction className="custom-action" />);
      const action = container.querySelector('[data-slot="card-action"]');
      expect(action).toHaveClass("custom-action");
    });
  });

  describe("Card composition", () => {
    it("正常系: すべてのCardコンポーネントを組み合わせて使用できる", () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>タイトル</CardTitle>
            <CardDescription>説明</CardDescription>
          </CardHeader>
          <CardContent>コンテンツ</CardContent>
          <CardFooter>フッター</CardFooter>
        </Card>
      );

      expect(screen.getByText("タイトル")).toBeInTheDocument();
      expect(screen.getByText("説明")).toBeInTheDocument();
      expect(screen.getByText("コンテンツ")).toBeInTheDocument();
      expect(screen.getByText("フッター")).toBeInTheDocument();
    });
  });
});




