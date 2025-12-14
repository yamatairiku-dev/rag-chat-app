import { describe, expect, it, beforeEach, vi } from "vitest";
import { redirect } from "react-router";

// モック
vi.mock("~/lib/session/session-manager", () => ({
  deleteSession: vi.fn(),
}));

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    redirect: vi.fn(),
  };
});

import { action } from "~/routes/auth.logout";
import { deleteSession } from "~/lib/session/session-manager";

const deleteSessionMock = vi.mocked(deleteSession);
const redirectMock = vi.mocked(redirect);

describe("auth.logout route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("正常系: セッションを削除してリダイレクトする", async () => {
    const clearCookie = "session=; Path=/; Max-Age=0; HttpOnly=true; SameSite=lax";
    deleteSessionMock.mockResolvedValue(clearCookie);
    redirectMock.mockReturnValue(new Response(null, { status: 302, headers: { Location: "/auth/login" } }));

    const request = new Request("http://localhost/auth/logout", {
      method: "POST",
    });

    const result = await action({ request } as never);

    expect(deleteSessionMock).toHaveBeenCalledWith(request);
    expect(redirectMock).toHaveBeenCalledWith("/auth/login", {
      headers: { "Set-Cookie": clearCookie },
    });
    expect(result).toBeInstanceOf(Response);
  });

  it("正常系: セッションが存在しない場合でもリダイレクトする", async () => {
    deleteSessionMock.mockResolvedValue(null);
    redirectMock.mockReturnValue(new Response(null, { status: 302, headers: { Location: "/auth/login" } }));

    const request = new Request("http://localhost/auth/logout", {
      method: "POST",
    });

    const result = await action({ request } as never);

    expect(deleteSessionMock).toHaveBeenCalledWith(request);
    expect(redirectMock).toHaveBeenCalledWith("/auth/login", {
      headers: { "Set-Cookie": "session=; Path=/; Max-Age=0" },
    });
    expect(result).toBeInstanceOf(Response);
  });
});





