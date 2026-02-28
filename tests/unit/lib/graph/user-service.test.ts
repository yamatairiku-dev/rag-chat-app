import { describe, expect, it, vi, beforeEach } from "vitest";
import { AppError, ErrorCode } from "~/types/error";

vi.mock("~/lib/graph/graph-client", () => ({
  createGraphClient: vi.fn(),
}));

vi.mock("~/lib/utils/env", () => ({
  env: {
    GRAPH_DEPARTMENT_GROUP_PREFIX: "DEPT_",
  },
}));

import { getUserInfo, getUserDepartment } from "~/lib/graph/user-service";
import { createGraphClient } from "~/lib/graph/graph-client";

describe("user-service", () => {
  let mockGraphClient: {
    api: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockGraphClient = {
      api: vi.fn(),
    };

    (createGraphClient as ReturnType<typeof vi.fn>).mockReturnValue(mockGraphClient);
  });

  describe("getUserInfo", () => {
    it("正常系: ユーザー情報を取得できる", async () => {
      const mockUser = {
        id: "user-123",
        displayName: "Test User",
        mail: "test@example.com",
        userPrincipalName: "test@example.com",
      };

      const mockApi = {
        get: vi.fn().mockResolvedValue(mockUser),
      };

      mockGraphClient.api.mockReturnValue(mockApi);

      const result = await getUserInfo("test-access-token");

      expect(result).toEqual(mockUser);
      expect(mockGraphClient.api).toHaveBeenCalledWith("/me");
      expect(mockApi.get).toHaveBeenCalled();
    });

    it("異常系: ユーザー情報が取得できない場合、AppErrorを投げる", async () => {
      const mockApi = {
        get: vi.fn().mockResolvedValue(null),
      };

      mockGraphClient.api.mockReturnValue(mockApi);

      await expect(getUserInfo("test-access-token")).rejects.toBeInstanceOf(AppError);
      await expect(getUserInfo("test-access-token")).rejects.toMatchObject({
        code: ErrorCode.GRAPH_USER_NOT_FOUND,
        statusCode: 404,
      });
    });

    it("異常系: ユーザーIDが存在しない場合、AppErrorを投げる", async () => {
      const mockUser = {
        displayName: "Test User",
        mail: "test@example.com",
      };

      const mockApi = {
        get: vi.fn().mockResolvedValue(mockUser),
      };

      mockGraphClient.api.mockReturnValue(mockApi);

      await expect(getUserInfo("test-access-token")).rejects.toBeInstanceOf(AppError);
      await expect(getUserInfo("test-access-token")).rejects.toMatchObject({
        code: ErrorCode.GRAPH_USER_NOT_FOUND,
        statusCode: 404,
      });
    });

    it("異常系: Graph APIエラー時にAppErrorを投げる", async () => {
      const error = new Error("Graph API error");
      const mockApi = {
        get: vi.fn().mockRejectedValue(error),
      };

      mockGraphClient.api.mockReturnValue(mockApi);

      await expect(getUserInfo("test-access-token")).rejects.toBeInstanceOf(AppError);
      await expect(getUserInfo("test-access-token")).rejects.toMatchObject({
        code: ErrorCode.GRAPH_API_ERROR,
        statusCode: 500,
      });
    });
  });

  describe("getUserDepartment", () => {
    it("正常系: 所属部署情報を取得できる", async () => {
      const mockResponse = {
        value: [
          {
            id: "group-1",
            displayName: "DEPT_001_営業部",
          },
          {
            id: "group-2",
            displayName: "その他のグループ",
          },
        ],
      };

      const mockApi = {
        get: vi.fn().mockResolvedValue(mockResponse),
      };

      mockGraphClient.api.mockReturnValue(mockApi);

      const result = await getUserDepartment("test-access-token");

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result[0]?.code).toBe("group-1");
      expect(result[0]?.name).toBe("DEPT_001_営業部");
      expect(result[0]?.groupId).toBe("group-1");
      expect(result[0]?.groupName).toBe("DEPT_001_営業部");
      expect(mockGraphClient.api).toHaveBeenCalledWith("/me/memberOf");
      expect(mockApi.get).toHaveBeenCalled();
    });

    it("正常系: プレフィックスに一致するグループがない場合、空配列を返す", async () => {
      const mockResponse = {
        value: [
          {
            id: "group-1",
            displayName: "その他のグループ",
          },
        ],
      };

      const mockApi = {
        get: vi.fn().mockResolvedValue(mockResponse),
      };

      mockGraphClient.api.mockReturnValue(mockApi);

      const result = await getUserDepartment("test-access-token");

      expect(result).toEqual([]);
    });

    it("正常系: グループが空の場合、空配列を返す", async () => {
      const mockResponse = {
        value: [],
      };

      const mockApi = {
        get: vi.fn().mockResolvedValue(mockResponse),
      };

      mockGraphClient.api.mockReturnValue(mockApi);

      const result = await getUserDepartment("test-access-token");

      expect(result).toEqual([]);
    });

    it("正常系: プレフィックスのみの表示名でもグループIDと表示名をそのまま返す", async () => {
      const mockResponse = {
        value: [
          {
            id: "group-1",
            displayName: "DEPT_",
          },
        ],
      };

      const mockApi = {
        get: vi.fn().mockResolvedValue(mockResponse),
      };

      mockGraphClient.api.mockReturnValue(mockApi);

      const result = await getUserDepartment("test-access-token");

      expect(result).toHaveLength(1);
      expect(result[0]?.code).toBe("group-1");
      expect(result[0]?.name).toBe("DEPT_");
    });

    it("正常系: 表示名を分割せずそのまま部署名として返す", async () => {
      const mockResponse = {
        value: [
          {
            id: "group-1",
            displayName: "DEPT_001_営業部_東京支社",
          },
        ],
      };

      const mockApi = {
        get: vi.fn().mockResolvedValue(mockResponse),
      };

      mockGraphClient.api.mockReturnValue(mockApi);

      const result = await getUserDepartment("test-access-token");

      expect(result).toHaveLength(1);
      expect(result[0]?.code).toBe("group-1");
      expect(result[0]?.name).toBe("DEPT_001_営業部_東京支社");
    });

    it("異常系: Graph APIエラー時にAppErrorを投げる", async () => {
      const error = new Error("Graph API error");
      const mockApi = {
        get: vi.fn().mockRejectedValue(error),
      };

      mockGraphClient.api.mockReturnValue(mockApi);

      await expect(getUserDepartment("test-access-token")).rejects.toBeInstanceOf(AppError);
      await expect(getUserDepartment("test-access-token")).rejects.toMatchObject({
        code: ErrorCode.GRAPH_API_ERROR,
        statusCode: 500,
      });
    });

    it("正常系: アンダースコアを含まない表示名もそのまま返す", async () => {
      const mockResponse = {
        value: [
          {
            id: "group-abc-123",
            displayName: "DEPT_営業部",
          },
        ],
      };

      const mockApi = {
        get: vi.fn().mockResolvedValue(mockResponse),
      };

      mockGraphClient.api.mockReturnValue(mockApi);

      const result = await getUserDepartment("test-access-token");

      expect(result).toHaveLength(1);
      expect(result[0]?.code).toBe("group-abc-123");
      expect(result[0]?.name).toBe("DEPT_営業部");
    });

    it("正常系: プレフィックスに一致しない表示名のグループは無視され空配列を返す", async () => {
      const mockResponse = {
        value: [
          {
            id: "group-1",
            displayName: "DEPT", // "DEPT_"で始まらないため対象外
          },
        ],
      };

      const mockApi = {
        get: vi.fn().mockResolvedValue(mockResponse),
      };

      mockGraphClient.api.mockReturnValue(mockApi);

      const result = await getUserDepartment("test-access-token");

      expect(result).toEqual([]);
    });

    it("正常系: displayNameが空文字列の場合は空配列を返す", async () => {
      const mockResponse = {
        value: [
          {
            id: "group-1",
            displayName: "", // 空文字列
          },
        ],
      };

      const mockApi = {
        get: vi.fn().mockResolvedValue(mockResponse),
      };

      mockGraphClient.api.mockReturnValue(mockApi);

      const result = await getUserDepartment("test-access-token");

      expect(result).toEqual([]);
    });

    it("正常系: 正規表現にマッチする複数グループをすべて配列で返す", async () => {
      const mockResponse = {
        value: [
          { id: "group-1", displayName: "DEPT_001_営業部" },
          { id: "group-2", displayName: "その他" },
          { id: "group-3", displayName: "DEPT_002_開発部" },
        ],
      };

      const mockApi = {
        get: vi.fn().mockResolvedValue(mockResponse),
      };

      mockGraphClient.api.mockReturnValue(mockApi);

      const result = await getUserDepartment("test-access-token");

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        code: "group-1",
        name: "DEPT_001_営業部",
        groupId: "group-1",
        groupName: "DEPT_001_営業部",
      });
      expect(result[1]).toEqual({
        code: "group-3",
        name: "DEPT_002_開発部",
        groupId: "group-3",
        groupName: "DEPT_002_開発部",
      });
    });

    it("異常系: AppError以外のエラーが発生した場合はAppErrorに変換", async () => {
      const error = new Error("Unknown error");
      const mockApi = {
        get: vi.fn().mockRejectedValue(error),
      };

      mockGraphClient.api.mockReturnValue(mockApi);

      await expect(getUserDepartment("test-access-token")).rejects.toBeInstanceOf(AppError);
      await expect(getUserDepartment("test-access-token")).rejects.toMatchObject({
        code: ErrorCode.GRAPH_API_ERROR,
        statusCode: 500,
      });
    });

    it("異常系: 文字列エラーが発生した場合もAppErrorに変換", async () => {
      const mockApi = {
        get: vi.fn().mockRejectedValue("String error"),
      };

      mockGraphClient.api.mockReturnValue(mockApi);

      await expect(getUserDepartment("test-access-token")).rejects.toBeInstanceOf(AppError);
      await expect(getUserDepartment("test-access-token")).rejects.toMatchObject({
        code: ErrorCode.GRAPH_API_ERROR,
        statusCode: 500,
      });
    });

    it("異常系: AppErrorが発生した場合はそのまま再スロー", async () => {
      const appError = new AppError(
        ErrorCode.GRAPH_API_ERROR,
        "Graph API error",
        500
      );
      const mockApi = {
        get: vi.fn().mockRejectedValue(appError),
      };

      mockGraphClient.api.mockReturnValue(mockApi);

      await expect(getUserDepartment("test-access-token")).rejects.toBe(appError);
      await expect(getUserDepartment("test-access-token")).rejects.toBeInstanceOf(AppError);
    });
  });
});



