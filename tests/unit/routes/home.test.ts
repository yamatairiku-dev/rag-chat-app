import { describe, expect, it, beforeEach, vi } from "vitest";
import { redirect } from "react-router";

// モック
vi.mock("~/lib/session/session-manager", () => ({
  getSession: vi.fn(),
}));

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    redirect: vi.fn(),
  };
});

import { loader, meta } from "~/routes/home";
import { getSession } from "~/lib/session/session-manager";

const getSessionMock = vi.mocked(getSession);
const redirectMock = vi.mocked(redirect);

describe("home route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("loader", () => {
    it("正常系: セッションが存在する場合は/chatにリダイレクト", async () => {
      const mockSession = {
        userId: "user-123",
        userEmail: "test@example.com",
        displayName: "Test User",
        departmentCode: "001",
        departmentName: "テスト部署",
        accessToken: "test-access-token",
        refreshToken: "test-refresh-token",
        tokenExpiresAt: Date.now() + 3600000,
        createdAt: Date.now(),
        lastAccessedAt: Date.now(),
      };

      getSessionMock.mockResolvedValue(mockSession);
      redirectMock.mockReturnValue(new Response(null, { status: 302, headers: { Location: "/chat" } }));

      const request = new Request("http://localhost/");
      const result = await loader({ request } as never);

      expect(getSessionMock).toHaveBeenCalledWith(request);
      expect(redirectMock).toHaveBeenCalledWith("/chat");
      expect(result).toBeInstanceOf(Response);
    });

    it("正常系: セッションが存在しない場合は/auth/loginにリダイレクト", async () => {
      getSessionMock.mockResolvedValue(null);
      redirectMock.mockReturnValue(new Response(null, { status: 302, headers: { Location: "/auth/login" } }));

      const request = new Request("http://localhost/");
      const result = await loader({ request } as never);

      expect(getSessionMock).toHaveBeenCalledWith(request);
      expect(redirectMock).toHaveBeenCalledWith("/auth/login");
      expect(result).toBeInstanceOf(Response);
    });
  });

  describe("meta", () => {
    it("正常系: メタデータを正しく返す", () => {
      const result = meta({} as never);

      expect(result).toEqual([
        { title: "社内RAG検索チャットボット" },
        { name: "description", content: "社内規則・マニュアルを検索できるチャットボット" },
      ]);
    });
  });
});


