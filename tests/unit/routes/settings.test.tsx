import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import type { UserSession } from "~/types/session";

// モック
vi.mock("~/lib/session/session-manager", () => ({
  requireUserSession: vi.fn(),
}));

vi.mock("~/components/layout/Header", () => ({
  Header: ({ user }: { user: UserSession }) => (
    <header data-testid="header">
      <div>ユーザー: {user.displayName}</div>
    </header>
  ),
}));

import { loader } from "~/routes/settings";
import Settings from "~/routes/settings";
import { requireUserSession } from "~/lib/session/session-manager";

const requireUserSessionMock = vi.mocked(requireUserSession);

const baseSession: UserSession = {
  userId: "user-123",
  userEmail: "test@example.com",
  displayName: "テストユーザー",
  departmentCodes: ["001"],
  departmentNames: ["テスト部署"],
  accessToken: "test-access-token",
  refreshToken: "test-refresh-token",
  tokenExpiresAt: Date.now() + 3600000,
  createdAt: Date.now(),
  lastAccessedAt: Date.now(),
};

function createRequest(url: string = "http://localhost/settings") {
  return new Request(url);
}

describe("settings route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("loader", () => {
    it("正常系: セッションが存在する場合はユーザー情報を返す", async () => {
      requireUserSessionMock.mockResolvedValue(baseSession);

      const request = createRequest();
      const response = await loader({ request } as never);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.user).toMatchObject({
        displayName: baseSession.displayName,
        userEmail: baseSession.userEmail,
        departmentCodes: baseSession.departmentCodes,
        departmentNames: baseSession.departmentNames,
      });
    });

    it("正常系: departmentNamesが空の場合はそのまま返す", async () => {
      const sessionWithoutDept = {
        ...baseSession,
        departmentNames: [] as string[],
      };
      requireUserSessionMock.mockResolvedValue(sessionWithoutDept);

      const request = createRequest();
      const response = await loader({ request } as never);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.user.departmentNames).toEqual([]);
    });
  });

  describe("Settings component", () => {
    it("正常系: ユーザー情報が表示される", async () => {
      requireUserSessionMock.mockResolvedValue(baseSession);

      const router = createMemoryRouter(
        [
          {
            path: "/settings",
            element: <Settings />,
            loader,
          },
        ],
        {
          initialEntries: ["/settings"],
        }
      );

      render(<RouterProvider router={router} />);

      await waitFor(() => {
        expect(screen.getByText("テストユーザー")).toBeInTheDocument();
      });

      expect(screen.getByText("test@example.com")).toBeInTheDocument();
      expect(screen.getByText("001")).toBeInTheDocument();
      expect(screen.getByText("テスト部署")).toBeInTheDocument();
    });

    it("正常系: departmentNamesが空の場合は「未設定」が表示される", async () => {
      const sessionWithoutDept = {
        ...baseSession,
        departmentNames: [] as string[],
      };
      requireUserSessionMock.mockResolvedValue(sessionWithoutDept);

      const router = createMemoryRouter(
        [
          {
            path: "/settings",
            element: <Settings />,
            loader,
          },
        ],
        {
          initialEntries: ["/settings"],
        }
      );

      render(<RouterProvider router={router} />);

      await waitFor(() => {
        expect(screen.getByText("未設定")).toBeInTheDocument();
      });
    });

    it("正常系: ログアウトボタンが表示される", async () => {
      requireUserSessionMock.mockResolvedValue(baseSession);

      const router = createMemoryRouter(
        [
          {
            path: "/settings",
            element: <Settings />,
            loader,
          },
        ],
        {
          initialEntries: ["/settings"],
        }
      );

      render(<RouterProvider router={router} />);

      await waitFor(() => {
        expect(screen.getByText("ログアウト")).toBeInTheDocument();
      });
    });

    it("正常系: すべてのユーザー情報フィールドが表示される", async () => {
      requireUserSessionMock.mockResolvedValue(baseSession);

      const router = createMemoryRouter(
        [
          {
            path: "/settings",
            element: <Settings />,
            loader,
          },
        ],
        {
          initialEntries: ["/settings"],
        }
      );

      render(<RouterProvider router={router} />);

      await waitFor(() => {
        expect(screen.getByText("表示名")).toBeInTheDocument();
        expect(screen.getByText("メールアドレス")).toBeInTheDocument();
        expect(screen.getByText("所属コード")).toBeInTheDocument();
        expect(screen.getByText("所属部署")).toBeInTheDocument();
      });
    });
  });
});

