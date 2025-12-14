import { describe, expect, it, beforeEach, vi } from "vitest";
import { redirect } from "react-router";

// モック
vi.mock("~/lib/auth/entra-client", () => ({
  getAuthorizationUrl: vi.fn(),
}));

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

import { loader } from "~/routes/auth.login";
import { getAuthorizationUrl } from "~/lib/auth/entra-client";
import { getSession } from "~/lib/session/session-manager";

const getAuthorizationUrlMock = vi.mocked(getAuthorizationUrl);
const redirectMock = vi.mocked(redirect);
const getSessionMock = vi.mocked(getSession);

describe("auth.login route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("正常系: action=redirect の場合は認証URLを生成してリダイレクトする", async () => {
    const authUrl = "https://login.microsoftonline.com/tenant/oauth2/v2.0/authorize?client_id=test";
    getSessionMock.mockResolvedValue(null);
    getAuthorizationUrlMock.mockResolvedValue(authUrl);
    redirectMock.mockReturnValue(new Response(null, { status: 302, headers: { Location: authUrl } }));

    const request = new Request("http://localhost/auth/login?action=redirect");
    const result = await loader({ request } as never);

    expect(getAuthorizationUrlMock).toHaveBeenCalled();
    expect(redirectMock).toHaveBeenCalledWith(authUrl);
    expect(result).toBeInstanceOf(Response);
  });

  it("異常系: action=redirect で認証URL生成に失敗した場合は500エラーを返す", async () => {
    getSessionMock.mockResolvedValue(null);
    getAuthorizationUrlMock.mockRejectedValue(new Error("認証URL生成エラー"));

    const request = new Request("http://localhost/auth/login?action=redirect");

    await expect(loader({ request } as never)).rejects.toBeInstanceOf(Response);
  });

  it("正常系: action未指定の場合はログインページを表示（loaderはnullを返す）", async () => {
    getSessionMock.mockResolvedValue(null);
    const request = new Request("http://localhost/auth/login");
    const result = await loader({ request } as never);
    expect(result).toBeNull();
    expect(getAuthorizationUrlMock).not.toHaveBeenCalled();
  });
});





