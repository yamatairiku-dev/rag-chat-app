import { describe, expect, it, vi, beforeEach } from "vitest";
import { Client } from "@microsoft/microsoft-graph-client";

// モック
vi.mock("@microsoft/microsoft-graph-client", () => ({
  Client: {
    init: vi.fn(),
  },
}));

import { createGraphClient } from "~/lib/graph/graph-client";

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





