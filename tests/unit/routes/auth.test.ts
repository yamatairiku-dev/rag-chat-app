import { describe, expect, it, beforeEach, vi } from "vitest";
import { redirect } from "react-router";
import { AppError, ErrorCode } from "~/types/error";

// モック
vi.mock("~/lib/auth/entra-client", () => ({
  exchangeCodeForTokens: vi.fn(),
}));

vi.mock("~/lib/graph/user-service", () => ({
  getUserInfo: vi.fn(),
  getUserDepartment: vi.fn(),
}));

vi.mock("~/lib/session/session-manager", () => ({
  createSession: vi.fn(),
}));

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    redirect: vi.fn(),
  };
});

import { loader } from "~/routes/auth";
import { exchangeCodeForTokens } from "~/lib/auth/entra-client";
import { getUserInfo, getUserDepartment } from "~/lib/graph/user-service";
import { createSession } from "~/lib/session/session-manager";

const exchangeCodeForTokensMock = vi.mocked(exchangeCodeForTokens);
const getUserInfoMock = vi.mocked(getUserInfo);
const getUserDepartmentMock = vi.mocked(getUserDepartment);
const createSessionMock = vi.mocked(createSession);
const redirectMock = vi.mocked(redirect);

describe("auth route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("異常系: errorパラメータがある場合は400エラーを返す", async () => {
    const request = new Request("http://localhost/auth?error=access_denied");

    const response = await loader({ request } as never);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("認証エラー: access_denied");
  });

  it("異常系: codeパラメータがない場合は400エラーを返す", async () => {
    const request = new Request("http://localhost/auth");

    const response = await loader({ request } as never);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("認証コードが見つかりません");
  });

  it("正常系: 認証フローが成功した場合は/chatにリダイレクト", async () => {
    const code = "test-auth-code";
    const tokens = {
      accessToken: "test-access-token",
      refreshToken: "test-refresh-token",
      expiresIn: 3600,
    };
    const userInfo = {
      id: "user-123",
      displayName: "Test User",
      mail: "test@example.com",
      userPrincipalName: "test@example.com",
    };
    const department = {
      code: "001",
      name: "テスト部署",
      groupId: "group-123",
      groupName: "DEPT_001_テスト部署",
    };
    const cookie = "session=test-session-id; Path=/; Max-Age=86400";

    exchangeCodeForTokensMock.mockResolvedValue(tokens);
    getUserInfoMock.mockResolvedValue(userInfo);
    getUserDepartmentMock.mockResolvedValue(department);
    createSessionMock.mockResolvedValue({ cookie, sessionId: "test-session-id" });
    redirectMock.mockReturnValue(new Response(null, { status: 302, headers: { Location: "/chat" } }));

    const request = new Request(`http://localhost/auth?code=${code}`);
    const result = await loader({ request } as never);

    expect(exchangeCodeForTokensMock).toHaveBeenCalledWith(code);
    expect(getUserInfoMock).toHaveBeenCalledWith(tokens.accessToken);
    expect(getUserDepartmentMock).toHaveBeenCalledWith(tokens.accessToken);
    expect(createSessionMock).toHaveBeenCalled();
    expect(redirectMock).toHaveBeenCalledWith("/chat", {
      headers: { "Set-Cookie": cookie },
    });
    expect(result).toBeInstanceOf(Response);
  });

  it("異常系: 所属部署が見つからない場合は403エラーを返す", async () => {
    const code = "test-auth-code";
    const tokens = {
      accessToken: "test-access-token",
      refreshToken: "test-refresh-token",
      expiresIn: 3600,
    };
    const userInfo = {
      id: "user-123",
      displayName: "Test User",
      mail: "test@example.com",
      userPrincipalName: "test@example.com",
    };

    exchangeCodeForTokensMock.mockResolvedValue(tokens);
    getUserInfoMock.mockResolvedValue(userInfo);
    getUserDepartmentMock.mockResolvedValue(null);

    const request = new Request(`http://localhost/auth?code=${code}`);
    const response = await loader({ request } as never);

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toContain("所属部署が見つかりません");
  });

  it("異常系: AppErrorが発生した場合はエラーレスポンスを返す", async () => {
    const code = "test-auth-code";
    const error = new AppError(
      ErrorCode.AUTH_INVALID_TOKEN,
      "無効なトークンです",
      401
    );

    exchangeCodeForTokensMock.mockRejectedValue(error);

    const request = new Request(`http://localhost/auth?code=${code}`);
    const response = await loader({ request } as never);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe("無効なトークンです");
  });

  it("異常系: 一般的なErrorが発生した場合は500エラーを返す", async () => {
    const code = "test-auth-code";
    const error = new Error("ネットワークエラー");

    exchangeCodeForTokensMock.mockRejectedValue(error);

    const request = new Request(`http://localhost/auth?code=${code}`);
    const response = await loader({ request } as never);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe("ネットワークエラー");
  });

  it("異常系: 未知のエラーが発生した場合は500エラーを返す", async () => {
    const code = "test-auth-code";

    exchangeCodeForTokensMock.mockRejectedValue("Unknown error");

    const request = new Request(`http://localhost/auth?code=${code}`);
    const response = await loader({ request } as never);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe("システムエラー");
  });

  it("正常系: mailが存在する場合はmailを使用", async () => {
    const code = "test-auth-code";
    const tokens = {
      accessToken: "test-access-token",
      refreshToken: "test-refresh-token",
      expiresIn: 3600,
    };
    const userInfo = {
      id: "user-123",
      displayName: "Test User",
      mail: "mail@example.com",
      userPrincipalName: "principal@example.com",
    };
    const department = {
      code: "001",
      name: "テスト部署",
      groupId: "group-123",
      groupName: "DEPT_001_テスト部署",
    };
    const cookie = "session=test-session-id; Path=/; Max-Age=86400";

    exchangeCodeForTokensMock.mockResolvedValue(tokens);
    getUserInfoMock.mockResolvedValue(userInfo);
    getUserDepartmentMock.mockResolvedValue(department);
    createSessionMock.mockResolvedValue({ cookie, sessionId: "test-session-id" });
    redirectMock.mockReturnValue(new Response(null, { status: 302, headers: { Location: "/chat" } }));

    const request = new Request(`http://localhost/auth?code=${code}`);
    await loader({ request } as never);

    // mail || userPrincipalName のロジックにより、mailが優先される
    const createSessionCall = createSessionMock.mock.calls[0][0];
    expect(createSessionCall.userEmail).toBe("mail@example.com");
  });

  it("正常系: mailが存在しない場合はuserPrincipalNameを使用", async () => {
    const code = "test-auth-code";
    const tokens = {
      accessToken: "test-access-token",
      refreshToken: "test-refresh-token",
      expiresIn: 3600,
    };
    const userInfo = {
      id: "user-123",
      displayName: "Test User",
      mail: undefined,
      userPrincipalName: "principal@example.com",
    };
    const department = {
      code: "001",
      name: "テスト部署",
      groupId: "group-123",
      groupName: "DEPT_001_テスト部署",
    };
    const cookie = "session=test-session-id; Path=/; Max-Age=86400";

    exchangeCodeForTokensMock.mockResolvedValue(tokens);
    getUserInfoMock.mockResolvedValue(userInfo);
    getUserDepartmentMock.mockResolvedValue(department);
    createSessionMock.mockResolvedValue({ cookie, sessionId: "test-session-id" });
    redirectMock.mockReturnValue(new Response(null, { status: 302, headers: { Location: "/chat" } }));

    const request = new Request(`http://localhost/auth?code=${code}`);
    await loader({ request } as never);

    // mail || userPrincipalName のロジックにより、userPrincipalNameが使用される
    const createSessionCall = createSessionMock.mock.calls[0][0];
    expect(createSessionCall.userEmail).toBe("principal@example.com");
  });
});

