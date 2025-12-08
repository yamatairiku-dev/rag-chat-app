import { describe, expect, it, beforeEach, vi } from "vitest";
import type { UserSession } from "~/types/session";

// モック
vi.mock("~/lib/session/session-manager", () => ({
  requireUserSession: vi.fn(),
}));

import { loader } from "~/routes/settings";
import { requireUserSession } from "~/lib/session/session-manager";

const requireUserSessionMock = vi.mocked(requireUserSession);

const baseSession: UserSession = {
  userId: "user-123",
  userEmail: "test@example.com",
  displayName: "テストユーザー",
  departmentCode: "001",
  departmentName: "テスト部署",
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
    requireUserSessionMock.mockResolvedValue(baseSession);
  });

  describe("loader", () => {
    it("正常系: ユーザー情報を取得できる", async () => {
      const request = createRequest();
      const response = await loader({ request } as never);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.user).toMatchObject({
        displayName: baseSession.displayName,
        userEmail: baseSession.userEmail,
        departmentCode: baseSession.departmentCode,
        departmentName: baseSession.departmentName,
      });
    });

    it("正常系: 部署名がない場合も正しく処理される", async () => {
      const sessionWithoutDepartment: UserSession = {
        ...baseSession,
        departmentName: undefined,
      };

      requireUserSessionMock.mockResolvedValue(sessionWithoutDepartment);

      const request = createRequest();
      const response = await loader({ request } as never);

      const data = await response.json();
      expect(data.user.departmentName).toBeUndefined();
    });

    it("正常系: requireUserSessionが呼ばれる", async () => {
      const request = createRequest();
      await loader({ request } as never);

      expect(requireUserSessionMock).toHaveBeenCalledWith(request);
    });
  });
});


