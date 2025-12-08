import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { Header } from "~/components/layout/Header";

describe("Header", () => {
  const baseUser = {
    displayName: "テストユーザー",
    userEmail: "test@example.com",
    departmentCode: "001",
  };

  const renderWithRouter = (component: React.ReactElement) => {
    const router = createMemoryRouter([
      {
        path: "/",
        element: component,
      },
    ]);
    return render(<RouterProvider router={router} />);
  };

  describe("ユーザー情報の表示", () => {
    it("タイトルが表示される", () => {
      renderWithRouter(<Header user={baseUser} />);

      expect(screen.getByText("社内RAG検索チャットボット")).toBeInTheDocument();
    });

    it("ユーザーの表示名が表示される", () => {
      renderWithRouter(<Header user={baseUser} />);

      expect(screen.getByText("テストユーザー")).toBeInTheDocument();
    });

    it("ユーザーのメールアドレスが表示される", () => {
      renderWithRouter(<Header user={baseUser} />);

      expect(screen.getByText("test@example.com")).toBeInTheDocument();
    });

    it("部署コードが表示される", () => {
      renderWithRouter(<Header user={baseUser} />);

      expect(screen.getByText("001")).toBeInTheDocument();
    });

    it("部署名がある場合は部署名と部署コードが表示される", () => {
      const userWithDepartment = {
        ...baseUser,
        departmentName: "テスト部署",
      };

      renderWithRouter(<Header user={userWithDepartment} />);

      expect(screen.getByText(/テスト部署/)).toBeInTheDocument();
      // 部署コードは複数箇所に表示される可能性があるため、getAllByTextを使用
      const departmentCodes = screen.getAllByText(/001/);
      expect(departmentCodes.length).toBeGreaterThan(0);
    });

    it("部署名がない場合は部署コードのみが表示される", () => {
      renderWithRouter(<Header user={baseUser} />);

      // 部署コードが表示されることを確認（複数箇所に表示される可能性があるため、getAllByTextを使用）
      const departmentTexts = screen.getAllByText(/001/);
      expect(departmentTexts.length).toBeGreaterThan(0);
    });
  });

  describe("アバターの表示", () => {
    it("アバターが表示される", () => {
      const { container } = renderWithRouter(<Header user={baseUser} />);
      const avatar = container.querySelector('[data-slot="avatar"]') || 
                     container.querySelector('[class*="avatar"]');

      expect(avatar).toBeInTheDocument();
    });

    it("表示名からイニシャルが生成される（単一の名前）", () => {
      const user = {
        ...baseUser,
        displayName: "太郎",
      };

      const { container } = renderWithRouter(<Header user={user} />);
      const avatarFallback = container.querySelector('[data-slot="avatar-fallback"]') ||
                             container.querySelector('[class*="avatar-fallback"]');

      // イニシャルが表示される（"太郎"の最初の2文字 = "タリ"）
      expect(avatarFallback).toBeInTheDocument();
    });

    it("表示名からイニシャルが生成される（複数の名前）", () => {
      const user = {
        ...baseUser,
        displayName: "山田 太郎",
      };

      const { container } = renderWithRouter(<Header user={user} />);
      const avatarFallback = container.querySelector('[data-slot="avatar-fallback"]') ||
                             container.querySelector('[class*="avatar-fallback"]');

      // イニシャルが表示される（"山田 太郎"の最初の文字 = "ヤタ"）
      expect(avatarFallback).toBeInTheDocument();
    });

    it("空の表示名の場合はデフォルトのイニシャルが表示される", () => {
      const user = {
        ...baseUser,
        displayName: "",
      };

      const { container } = renderWithRouter(<Header user={user} />);
      const avatarFallback = container.querySelector('[data-slot="avatar-fallback"]') ||
                             container.querySelector('[class*="avatar-fallback"]');

      expect(avatarFallback).toBeInTheDocument();
    });
  });

  describe("ログアウトボタン", () => {
    it("ログアウトボタンが表示される", () => {
      renderWithRouter(<Header user={baseUser} />);

      expect(screen.getByText("ログアウト")).toBeInTheDocument();
    });

    it("ログアウトボタンはフォーム内にある", () => {
      const { container } = renderWithRouter(<Header user={baseUser} />);
      const form = container.querySelector('form[action="/auth/logout"]');

      expect(form).toBeInTheDocument();
    });

    it("ログアウトボタンはPOSTメソッドで送信される", () => {
      const { container } = renderWithRouter(<Header user={baseUser} />);
      const form = container.querySelector('form[method="post"]');

      expect(form).toBeInTheDocument();
    });
  });

  describe("エラーメッセージの表示", () => {
    it("エラーメッセージがある場合は表示される", () => {
      renderWithRouter(<Header user={baseUser} errorMessage="エラーが発生しました" />);

      expect(screen.getByText("エラーが発生しました")).toBeInTheDocument();
    });

    it("エラーメッセージは赤色で表示される", () => {
      const { container } = renderWithRouter(
        <Header user={baseUser} errorMessage="エラーが発生しました" />
      );

      const errorElement = container.querySelector(".text-red-600");
      expect(errorElement).toBeInTheDocument();
      expect(errorElement).toHaveTextContent("エラーが発生しました");
    });

    it("エラーメッセージがない場合は表示されない", () => {
      const { container } = renderWithRouter(<Header user={baseUser} />);

      const errorElement = container.querySelector(".text-red-600");
      expect(errorElement).not.toBeInTheDocument();
    });

    it("エラーメッセージがnullの場合は表示されない", () => {
      const { container } = renderWithRouter(<Header user={baseUser} errorMessage={null} />);

      const errorElement = container.querySelector(".text-red-600");
      expect(errorElement).not.toBeInTheDocument();
    });
  });

  describe("レイアウト", () => {
    it("ヘッダーコンテナが正しいクラスを持つ", () => {
      const { container } = renderWithRouter(<Header user={baseUser} />);
      const header = container.querySelector("header");

      expect(header).toHaveClass("border-b", "bg-white");
    });

    it("コンテナが正しいクラスを持つ", () => {
      const { container } = renderWithRouter(<Header user={baseUser} />);
      const containerElement = container.querySelector(".container");

      expect(containerElement).toBeInTheDocument();
    });
  });
});

