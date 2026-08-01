import { render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router");
  return {
    ...actual,
    isRouteErrorResponse: (error: unknown) =>
      Boolean(error && typeof error === "object" && "status" in error),
    Links: () => null,
    Meta: () => null,
    Outlet: () => <div data-testid="outlet" />,
    Scripts: () => <div data-testid="scripts" />,
    ScrollRestoration: () => <div data-testid="scroll-restoration" />,
  };
});

import App, { ErrorBoundary, Layout, links } from "~/root";

describe("root", () => {
  it("フォント用リンクを返す", () => {
    expect(links()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ rel: "preconnect" }),
        expect.objectContaining({ rel: "stylesheet" }),
      ]),
    );
  });

  it("日本語のドキュメントレイアウトを描画する", () => {
    const markup = renderToStaticMarkup(
      <Layout>
        <p>本文</p>
      </Layout>,
    );

    expect(markup).toContain('<html lang="ja">');
    expect(markup).toContain("本文");
    expect(markup).toContain('data-testid="scripts"');
  });

  it("ルートOutletを描画する", () => {
    render(<App />);
    expect(screen.getByTestId("outlet")).toBeInTheDocument();
  });

  it.each([
    [404, "ページが見つかりません"],
    [401, "認証が必要です"],
    [403, "アクセス権限がありません"],
    [500, "サーバーエラー"],
    [418, "エラー (418)"],
  ])("HTTP %i の案内を表示する", (status, expected) => {
    render(
      <ErrorBoundary
        error={{ status, statusText: "status text", data: null } as never}
        params={{}}
      />,
    );

    expect(screen.getByRole("heading", { name: expected })).toBeInTheDocument();
    expect(screen.getByText(`ステータスコード: ${status}`)).toBeInTheDocument();
  });

  it("レスポンスのカスタムメッセージを表示する", () => {
    render(
      <ErrorBoundary
        error={{ status: 403, statusText: "", data: { error: "利用できません" } } as never}
        params={{}}
      />,
    );

    expect(screen.getByText("利用できません")).toBeInTheDocument();
  });

  it("未知のエラーには安全なメッセージを表示する", () => {
    render(<ErrorBoundary error="unknown" params={{}} />);
    expect(screen.getByText(/予期しないエラー/)).toBeInTheDocument();
  });
});
