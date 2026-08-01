import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { Client } from "@microsoft/microsoft-graph-client";

// モック
vi.mock("@microsoft/microsoft-graph-client", () => ({
  Client: {
    init: vi.fn(),
  },
}));

import { createGraphClient, withGraphRetry } from "~/lib/graph/graph-client";

const ClientInitMock = vi.mocked(Client.init);

describe("graph-client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("正常系: Graph APIクライアントを作成できる", () => {
    const mockClient = {} as Client;
    ClientInitMock.mockReturnValue(mockClient);

    const accessToken = "test-access-token";
    const result = createGraphClient(accessToken);

    expect(ClientInitMock).toHaveBeenCalledWith({
      authProvider: expect.any(Function),
    });
    expect(result).toBe(mockClient);
  });

  it("正常系: authProviderが正しいトークンを返す", () => {
    const mockClient = {} as Client;
    ClientInitMock.mockReturnValue(mockClient);

    const accessToken = "test-access-token-123";
    createGraphClient(accessToken);

    const initCall = ClientInitMock.mock.calls[0][0];
    const authProvider = initCall.authProvider;

    // authProviderを呼び出してトークンが正しく返されることを確認
    const doneCallback = vi.fn();
    authProvider(doneCallback);

    expect(doneCallback).toHaveBeenCalledWith(null, accessToken);
  });
});

describe("withGraphRetry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("正常系: 成功した場合はそのまま結果を返す", async () => {
    const operation = vi.fn().mockResolvedValue("ok");

    const result = await withGraphRetry(operation);

    expect(result).toBe("ok");
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("正常系: statusCode不明のエラーはリトライして成功する", async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new Error("network error"))
      .mockResolvedValueOnce("ok");

    const resultPromise = withGraphRetry(operation);
    await vi.advanceTimersByTimeAsync(1000);
    const result = await resultPromise;

    expect(result).toBe("ok");
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it("正常系: 5xxエラーはリトライして成功する", async () => {
    const serverError = Object.assign(new Error("server error"), {
      statusCode: 503,
    });
    const operation = vi
      .fn()
      .mockRejectedValueOnce(serverError)
      .mockResolvedValueOnce("ok");

    const resultPromise = withGraphRetry(operation);
    await vi.advanceTimersByTimeAsync(1000);
    const result = await resultPromise;

    expect(result).toBe("ok");
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it("異常系: 4xxエラーは即座に投げてリトライしない", async () => {
    const clientError = Object.assign(new Error("not found"), {
      statusCode: 404,
    });
    const operation = vi.fn().mockRejectedValue(clientError);

    await expect(withGraphRetry(operation)).rejects.toBe(clientError);
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("異常系: 上限回数まで再試行してもなお失敗する場合は最後のエラーを投げる", async () => {
    const serverError = Object.assign(new Error("still down"), {
      statusCode: 500,
    });
    const operation = vi.fn().mockRejectedValue(serverError);

    const resultPromise = withGraphRetry(operation);
    resultPromise.catch(() => {
      // 未処理拒否警告を防ぐためのno-op（下でrejectsアサーション済み）
    });
    await vi.advanceTimersByTimeAsync(5000);

    await expect(resultPromise).rejects.toBe(serverError);
    expect(operation).toHaveBeenCalledTimes(3); // 初回 + 2回リトライ
  });
});





