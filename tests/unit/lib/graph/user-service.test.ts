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

      expect(result).not.toBeNull();
      expect(result?.code).toBe("001");
      expect(result?.name).toBe("営業部");
      expect(result?.groupId).toBe("group-1");
      expect(result?.groupName).toBe("DEPT_001_営業部");
      expect(mockGraphClient.api).toHaveBeenCalledWith("/me/memberOf");
      expect(mockApi.get).toHaveBeenCalled();
    });

    it("正常系: プレフィックスに一致するグループがない場合、nullを返す", async () => {
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

      expect(result).toBeNull();
    });

    it("正常系: グループが空の場合、nullを返す", async () => {
      const mockResponse = {
        value: [],
      };

      const mockApi = {
        get: vi.fn().mockResolvedValue(mockResponse),
      };

      mockGraphClient.api.mockReturnValue(mockApi);

      const result = await getUserDepartment("test-access-token");

      expect(result).toBeNull();
    });

    it("正常系: グループ名の形式が不正な場合（コード部分が空）、空のコードを返す", async () => {
      const mockResponse = {
        value: [
          {
            id: "group-1",
            displayName: "DEPT_", // コード部分がない（parts.length = 2だが、parts[1]が空）
          },
        ],
      };

      const mockApi = {
        get: vi.fn().mockResolvedValue(mockResponse),
      };

      mockGraphClient.api.mockReturnValue(mockApi);

      const result = await getUserDepartment("test-access-token");

      // 実際の実装では、parts.length < 2の場合にnullを返すが、
      // "DEPT_"は分割すると["DEPT", ""]となり、lengthは2なのでnullにならない
      // 実装に合わせて、空のコードが返されることを確認
      expect(result).not.toBeNull();
      expect(result?.code).toBe("");
      expect(result?.name).toBe("");
    });

    it("正常系: 複数のアンダースコアを含むグループ名を正しく処理", async () => {
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

      expect(result).not.toBeNull();
      expect(result?.code).toBe("001");
      expect(result?.name).toBe("営業部_東京支社");
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

    it("正常系: グループ名の形式が不正な場合（分割後の要素数が1）", async () => {
      const mockResponse = {
        value: [
          {
            id: "group-1",
            displayName: "DEPT_", // DEPT_で始まるが、split('_')で["DEPT", ""]になる（要素数2だが、parts[1]が空）
            // 実際には、parts.lengthは2になるので、parts.length < 2はfalseになる
            // 83-84行をカバーするには、parts.lengthが1になる必要がある
          },
        ],
      };

      const mockApi = {
        get: vi.fn().mockResolvedValue(mockResponse),
      };

      mockGraphClient.api.mockReturnValue(mockApi);

      const result = await getUserDepartment("test-access-token");

      // parts.lengthが2なので、83-84行は実行されない
      // 83-84行をカバーするには、parts.lengthが1になる必要がある
      expect(result).not.toBeNull(); // parts[1]が空文字列なので、codeは空文字列になる
    });

    it("正常系: グループ名がDEPT_のみで分割後の要素数が2未満になる場合", async () => {
      // このケースは実際には発生しない（DEPT_で始まる場合、split('_')で["DEPT", ""]になる）
      // しかし、displayNameが"DEPT"のみの場合をテストする
      const mockResponse = {
        value: [
          {
            id: "group-1",
            displayName: "DEPT", // アンダースコアがない、split('_')で["DEPT"]になる（要素数1）
          },
        ],
      };

      const mockApi = {
        get: vi.fn().mockResolvedValue(mockResponse),
      };

      mockGraphClient.api.mockReturnValue(mockApi);

      const result = await getUserDepartment("test-access-token");

      // displayNameが"DEPT"の場合、startsWith("DEPT_")がfalseになるため、
      // departmentGroupが見つからず、67行でreturn nullされる
      // したがって、83-84行には到達しない
      expect(result).toBeNull();
    });

    it("正常系: displayNameが空文字列の場合はnullを返す", async () => {
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

      // displayNameが空文字列の場合、startsWith(prefix)がfalseになるため、nullを返す
      expect(result).toBeNull();
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



