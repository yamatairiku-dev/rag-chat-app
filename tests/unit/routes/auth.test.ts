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
  const actual = await vi.importActual<typeof import("react-router")>("react-router");
  return {
    ...actual,
    redirect: vi.fn((url: string, init?: ResponseInit) => actual.redirect(url, init)),
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

  it("異常系: errorパラメータがある場合はエラーページへリダイレクト", async () => {
    const request = new Request("http://localhost/auth?error=access_denied");

    const response = await loader({ request } as never);

    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBe(302);
    const location = response.headers.get("Location") ?? "";
    expect(location).toContain("/error");
    expect(location).toContain(encodeURIComponent("認証エラー: access_denied"));
    expect(location).toContain("status=400");
  });

  it("異常系: codeパラメータがない場合はエラーページへリダイレクト", async () => {
    const request = new Request("http://localhost/auth");

    const response = await loader({ request } as never);

    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBe(302);
    const location = response.headers.get("Location") ?? "";
    expect(location).toContain("/error");
    expect(location).toContain(encodeURIComponent("認証コードが見つかりません"));
    expect(location).toContain("status=400");
  });

  it("正常系: 認証フローが成功した場合は/chatにリダイレクト", async () => {
    const code = "test-auth-code";
    const tokens = {
      accessToken: "test-access-token",
      refreshToken: "test-refresh-token",
      idToken: "test-id-token",
      expiresIn: 3600,
    };
    const userInfo = {
      id: "user-123",
      displayName: "Test User",
      givenName: "Test",
      surname: "User",
      mail: "test@example.com",
      userPrincipalName: "test@example.com",
      businessPhones: [],
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
    getUserDepartmentMock.mockResolvedValue([department]);
    createSessionMock.mockResolvedValue({ cookie, sessionId: "test-session-id" });
    redirectMock.mockReturnValueOnce(new Response(null, { status: 302, headers: { Location: "/chat" } }));

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

  it("異常系: 所属部署が見つからない場合はエラーページへリダイレクト", async () => {
    const code = "test-auth-code";
    const tokens = {
      accessToken: "test-access-token",
      refreshToken: "test-refresh-token",
      idToken: "test-id-token",
      expiresIn: 3600,
    };
    const userInfo = {
      id: "user-123",
      displayName: "Test User",
      givenName: "Test",
      surname: "User",
      mail: "test@example.com",
      userPrincipalName: "test@example.com",
      businessPhones: [],
    };

    exchangeCodeForTokensMock.mockResolvedValue(tokens);
    getUserInfoMock.mockResolvedValue(userInfo);
    getUserDepartmentMock.mockResolvedValue([]);

    const request = new Request(`http://localhost/auth?code=${code}`);
    const response = await loader({ request } as never);

    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBe(302);
    const location = response.headers.get("Location") ?? "";
    expect(location).toContain("/error");
    expect(location).toContain(encodeURIComponent("所属部署が見つかりません。アクセス権限がありません。"));
    expect(location).toContain("status=403");
  });

  it("異常系: AppErrorが発生した場合はエラーページへリダイレクト", async () => {
    const code = "test-auth-code";
    const error = new AppError(
      ErrorCode.AUTH_INVALID_TOKEN,
      "無効なトークンです",
      401
    );

    exchangeCodeForTokensMock.mockRejectedValue(error);

    const request = new Request(`http://localhost/auth?code=${code}`);
    const response = await loader({ request } as never);

    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBe(302);
    const location = response.headers.get("Location") ?? "";
    expect(location).toContain("/error");
    expect(location).toContain(encodeURIComponent("無効なトークンです"));
    expect(location).toContain("status=401");
  });

  it("異常系: 一般的なErrorが発生した場合はエラーページへリダイレクト", async () => {
    const code = "test-auth-code";
    const error = new Error("ネットワークエラー");

    exchangeCodeForTokensMock.mockRejectedValue(error);

    const request = new Request(`http://localhost/auth?code=${code}`);
    const response = await loader({ request } as never);

    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBe(302);
    const location = response.headers.get("Location") ?? "";
    expect(location).toContain("/error");
    expect(location).toContain(encodeURIComponent("ネットワークエラー"));
    expect(location).toContain("status=500");
  });

  it("異常系: 未知のエラーが発生した場合はエラーページへリダイレクト", async () => {
    const code = "test-auth-code";

    exchangeCodeForTokensMock.mockRejectedValue("Unknown error");

    const request = new Request(`http://localhost/auth?code=${code}`);
    const response = await loader({ request } as never);

    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBe(302);
    const location = response.headers.get("Location") ?? "";
    expect(location).toContain("/error");
    expect(location).toContain(encodeURIComponent("システムエラー"));
    expect(location).toContain("status=500");
  });

  it("正常系: mailが存在する場合はmailを使用", async () => {
    const code = "test-auth-code";
    const tokens = {
      accessToken: "test-access-token",
      refreshToken: "test-refresh-token",
      idToken: "test-id-token",
      expiresIn: 3600,
    };
    const userInfo = {
      id: "user-123",
      displayName: "Test User",
      givenName: "Test",
      surname: "User",
      mail: "mail@example.com",
      userPrincipalName: "principal@example.com",
      businessPhones: [],
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
    getUserDepartmentMock.mockResolvedValue([department]);
    createSessionMock.mockResolvedValue({ cookie, sessionId: "test-session-id" });
    redirectMock.mockReturnValueOnce(
      new Response(null, { status: 302, headers: { Location: "/chat" } })
    );

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
      idToken: "test-id-token",
      expiresIn: 3600,
    };
    const userInfo = {
      id: "user-123",
      displayName: "Test User",
      givenName: "Test",
      surname: "User",
      mail: "",
      userPrincipalName: "principal@example.com",
      businessPhones: [],
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
    getUserDepartmentMock.mockResolvedValue([department]);
    createSessionMock.mockResolvedValue({ cookie, sessionId: "test-session-id" });
    redirectMock.mockReturnValueOnce(
      new Response(null, { status: 302, headers: { Location: "/chat" } })
    );

    const request = new Request(`http://localhost/auth?code=${code}`);
    await loader({ request } as never);

    // mail || userPrincipalName のロジックにより、userPrincipalNameが使用される
    const createSessionCall = createSessionMock.mock.calls[0][0];
    expect(createSessionCall.userEmail).toBe("principal@example.com");
  });
});

