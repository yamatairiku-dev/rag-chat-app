import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { AppError } from "~/types/error";

const fetchMock = vi.fn();

vi.mock("~/lib/utils/env", () => ({
  env: {
    DIFY_API_URL: "https://dify.test/api",
    DIFY_API_KEY: "app-test-key",
    DIFY_TIMEOUT: 5000,
    DIFY_MAX_RETRIES: 0, // テストではリトライを無効化（高速化のため）
  },
}));

import { DifyClient } from "~/lib/dify/client";

describe("DifyClient", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sendMessage: 正常系レスポンスを返す", async () => {
    const responseBody = {
      event: "message",
      answer: "こんにちは！",
      conversation_id: "conv-1",
      message_id: "msg-1",
      mode: "chat",
      metadata: {
        usage: {
          prompt_tokens: 1,
          prompt_unit_price: "0",
          prompt_price_unit: "token",
          prompt_price: "0",
          completion_tokens: 1,
          completion_unit_price: "0",
          completion_price_unit: "token",
          completion_price: "0",
          total_tokens: 2,
          total_price: "0",
          currency: "JPY",
          latency: 10,
        },
        retriever_resources: [],
      },
      created_at: Date.now(),
    };

    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(responseBody), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const client = new DifyClient();
    const result = await client.sendMessage({
      inputs: { user_id: "user@test", department_code: "001" },
      query: "テスト",
      response_mode: "blocking",
      conversation_id: "",
      user: "user@test",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://dify.test/api/chat-messages",
      expect.objectContaining({
        method: "POST",
      }),
    );
    expect(result.answer).toBe("こんにちは！");
    expect(result.conversation_id).toBe("conv-1");
  });

  it("sendMessage: エラーレスポンスをAppErrorとして投げる", async () => {
    const errorBody = {
      code: "bad_request",
      message: "invalid input",
      status: 400,
    };

    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(errorBody), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const client = new DifyClient();

    await expect(
      client.sendMessage({
        inputs: { user_id: "user@test", department_code: "001" },
        query: "テスト",
        response_mode: "blocking",
        conversation_id: "",
        user: "user@test",
      }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("streamMessage: SSEイベントを順に返す", async () => {
    const encoder = new TextEncoder();
    const chunks = [
      encoder.encode(
        `data: ${JSON.stringify({
          event: "message",
          answer: "やあ",
          conversation_id: "conv-1",
          message_id: "msg-1",
          mode: "chat",
          task_id: "task-1",
          id: "evt-1",
          created_at: Date.now(),
        })}\n\n`,
      ),
      encoder.encode(
        `data: ${JSON.stringify({
          event: "message_end",
          conversation_id: "conv-1",
          message_id: "msg-1",
          mode: "chat",
          task_id: "task-1",
          id: "evt-2",
          metadata: {
            usage: {
              prompt_tokens: 1,
              completion_tokens: 1,
              total_tokens: 2,
              total_price: "0",
              currency: "JPY",
              latency: 10,
            },
            retriever_resources: [],
          },
          created_at: Date.now(),
        })}\n\n`,
      ),
    ];

    const stream = new ReadableStream({
      pull(controller) {
        if (chunks.length === 0) {
          controller.close();
          return;
        }
        controller.enqueue(chunks.shift());
      },
    });

    fetchMock.mockResolvedValue(
      new Response(stream, {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      }),
    );

    const client = new DifyClient();
    const events: unknown[] = [];

    for await (const event of client.streamMessage({
      inputs: { user_id: "user@test", department_code: "001" },
      query: "テスト",
      response_mode: "streaming",
      conversation_id: "",
      user: "user@test",
    })) {
      events.push(event);
    }

    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({ event: "message", answer: "やあ" });
    expect(events[1]).toMatchObject({ event: "message_end" });
  });

  it("sendMessage: 無効なレスポンス形式をAppErrorとして投げる", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ invalid: "response" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const client = new DifyClient();

    await expect(
      client.sendMessage({
        inputs: { user_id: "user@test", department_code: "001" },
        query: "テスト",
        response_mode: "blocking",
        conversation_id: "",
        user: "user@test",
      }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("sendMessage: エラーレスポンス（bodyなし）をAppErrorとして投げる", async () => {
    fetchMock.mockResolvedValue(
      new Response("", {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const client = new DifyClient();

    await expect(
      client.sendMessage({
        inputs: { user_id: "user@test", department_code: "001" },
        query: "テスト",
        response_mode: "blocking",
        conversation_id: "",
        user: "user@test",
      }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("sendMessage: ネットワークエラーをAppErrorとして投げる", async () => {
    fetchMock.mockRejectedValue(new Error("Network error"));

    const client = new DifyClient();

    await expect(
      client.sendMessage({
        inputs: { user_id: "user@test", department_code: "001" },
        query: "テスト",
        response_mode: "blocking",
        conversation_id: "",
        user: "user@test",
      }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("sendMessage: 非ErrorオブジェクトのエラーをAppErrorとして投げる", async () => {
    fetchMock.mockRejectedValue("String error");

    const client = new DifyClient();

    await expect(
      client.sendMessage({
        inputs: { user_id: "user@test", department_code: "001" },
        query: "テスト",
        response_mode: "blocking",
        conversation_id: "",
        user: "user@test",
      }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("streamMessage: エラーレスポンス（JSON解析失敗）をAppErrorとして投げる", async () => {
    fetchMock.mockResolvedValue(
      new Response("invalid json", {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const client = new DifyClient();

    await expect(
      (async () => {
        for await (const _ of client.streamMessage({
          inputs: { user_id: "user@test", department_code: "001" },
          query: "テスト",
          response_mode: "streaming",
          conversation_id: "",
          user: "user@test",
        })) {
          // noop
        }
      })(),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("streamMessage: 空のレスポンスボディをAppErrorとして投げる", async () => {
    fetchMock.mockResolvedValue(
      new Response(null, {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      }),
    );

    const client = new DifyClient();

    await expect(
      (async () => {
        for await (const _ of client.streamMessage({
          inputs: { user_id: "user@test", department_code: "001" },
          query: "テスト",
          response_mode: "streaming",
          conversation_id: "",
          user: "user@test",
        })) {
          // noop
        }
      })(),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("streamMessage: data行がないイベントをスキップする", async () => {
    const encoder = new TextEncoder();
    const chunks = [
      encoder.encode(`: comment line\n\n`),
      encoder.encode(
        `data: ${JSON.stringify({
          event: "message",
          answer: "やあ",
          conversation_id: "conv-1",
          message_id: "msg-1",
          mode: "chat",
          task_id: "task-1",
          id: "evt-1",
          created_at: Date.now(),
        })}\n\n`,
      ),
    ];

    const stream = new ReadableStream({
      pull(controller) {
        if (chunks.length === 0) {
          controller.close();
          return;
        }
        controller.enqueue(chunks.shift());
      },
    });

    fetchMock.mockResolvedValue(
      new Response(stream, {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      }),
    );

    const client = new DifyClient();
    const events: unknown[] = [];

    for await (const event of client.streamMessage({
      inputs: { user_id: "user@test", department_code: "001" },
      query: "テスト",
      response_mode: "streaming",
      conversation_id: "",
      user: "user@test",
    })) {
      events.push(event);
    }

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ event: "message", answer: "やあ" });
  });

  it("streamMessage: [DONE]イベントをスキップする", async () => {
    const encoder = new TextEncoder();
    const chunks = [
      encoder.encode(`data: [DONE]\n\n`),
      encoder.encode(
        `data: ${JSON.stringify({
          event: "message",
          answer: "やあ",
          conversation_id: "conv-1",
          message_id: "msg-1",
          mode: "chat",
          task_id: "task-1",
          id: "evt-1",
          created_at: Date.now(),
        })}\n\n`,
      ),
    ];

    const stream = new ReadableStream({
      pull(controller) {
        if (chunks.length === 0) {
          controller.close();
          return;
        }
        controller.enqueue(chunks.shift());
      },
    });

    fetchMock.mockResolvedValue(
      new Response(stream, {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      }),
    );

    const client = new DifyClient();
    const events: unknown[] = [];

    for await (const event of client.streamMessage({
      inputs: { user_id: "user@test", department_code: "001" },
      query: "テスト",
      response_mode: "streaming",
      conversation_id: "",
      user: "user@test",
    })) {
      events.push(event);
    }

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ event: "message", answer: "やあ" });
  });

  it("streamMessage: 空のpayloadをスキップする", async () => {
    const encoder = new TextEncoder();
    const chunks = [
      encoder.encode(`data: \n\n`),
      encoder.encode(
        `data: ${JSON.stringify({
          event: "message",
          answer: "やあ",
          conversation_id: "conv-1",
          message_id: "msg-1",
          mode: "chat",
          task_id: "task-1",
          id: "evt-1",
          created_at: Date.now(),
        })}\n\n`,
      ),
    ];

    const stream = new ReadableStream({
      pull(controller) {
        if (chunks.length === 0) {
          controller.close();
          return;
        }
        controller.enqueue(chunks.shift());
      },
    });

    fetchMock.mockResolvedValue(
      new Response(stream, {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      }),
    );

    const client = new DifyClient();
    const events: unknown[] = [];

    for await (const event of client.streamMessage({
      inputs: { user_id: "user@test", department_code: "001" },
      query: "テスト",
      response_mode: "streaming",
      conversation_id: "",
      user: "user@test",
    })) {
      events.push(event);
    }

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ event: "message", answer: "やあ" });
  });

  it("streamMessage: 無効なJSONをAppErrorとして投げる", async () => {
    const encoder = new TextEncoder();
    const chunks = [
      encoder.encode(`data: invalid json\n\n`),
    ];

    const stream = new ReadableStream({
      pull(controller) {
        if (chunks.length === 0) {
          controller.close();
          return;
        }
        controller.enqueue(chunks.shift());
      },
    });

    fetchMock.mockResolvedValue(
      new Response(stream, {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      }),
    );

    const client = new DifyClient();

    await expect(
      (async () => {
        for await (const _ of client.streamMessage({
          inputs: { user_id: "user@test", department_code: "001" },
          query: "テスト",
          response_mode: "streaming",
          conversation_id: "",
          user: "user@test",
        })) {
          // noop
        }
      })(),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("streamMessage: 複数のイベントをバッファリングして処理する", async () => {
    const encoder = new TextEncoder();
    const chunks = [
      encoder.encode(
        `data: ${JSON.stringify({
          event: "message",
          answer: "やあ",
          conversation_id: "conv-1",
          message_id: "msg-1",
          mode: "chat",
          task_id: "task-1",
          id: "evt-1",
          created_at: Date.now(),
        })}\n\ndata: ${JSON.stringify({
          event: "message",
          answer: "こんにちは",
          conversation_id: "conv-1",
          message_id: "msg-2",
          mode: "chat",
          task_id: "task-1",
          id: "evt-2",
          created_at: Date.now(),
        })}\n\n`,
      ),
    ];

    const stream = new ReadableStream({
      pull(controller) {
        if (chunks.length === 0) {
          controller.close();
          return;
        }
        controller.enqueue(chunks.shift());
      },
    });

    fetchMock.mockResolvedValue(
      new Response(stream, {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      }),
    );

    const client = new DifyClient();
    const events: unknown[] = [];

    for await (const event of client.streamMessage({
      inputs: { user_id: "user@test", department_code: "001" },
      query: "テスト",
      response_mode: "streaming",
      conversation_id: "",
      user: "user@test",
    })) {
      events.push(event);
    }

    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({ event: "message", answer: "やあ" });
    expect(events[1]).toMatchObject({ event: "message", answer: "こんにちは" });
  });

  it("buildUrl: baseUrlの末尾スラッシュを削除する", async () => {
    const responseBody = {
      event: "message",
      answer: "こんにちは！",
      conversation_id: "conv-1",
      message_id: "msg-1",
      mode: "chat",
      metadata: {
        usage: {
          prompt_tokens: 1,
          prompt_unit_price: "0",
          prompt_price_unit: "token",
          prompt_price: "0",
          completion_tokens: 1,
          completion_unit_price: "0",
          completion_price_unit: "token",
          completion_price: "0",
          total_tokens: 2,
          total_price: "0",
          currency: "JPY",
          latency: 10,
        },
        retriever_resources: [],
      },
      created_at: Date.now(),
    };

    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(responseBody), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const client = new DifyClient("https://dify.test/api/", "app-test-key");
    await client.sendMessage({
      inputs: { user_id: "user@test", department_code: "001" },
      query: "テスト",
      response_mode: "blocking",
      conversation_id: "",
      user: "user@test",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://dify.test/api/chat-messages",
      expect.any(Object),
    );
  });

  it("sendMessage: answerが文字列でない場合はAppErrorを投げる", async () => {
    const invalidResponse = {
      answer: 123, // 文字列でない
      conversation_id: "conv-1",
    };

    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(invalidResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const client = new DifyClient();

    await expect(
      client.sendMessage({
        inputs: { user_id: "user@test", department_code: "001" },
        query: "テスト",
        response_mode: "blocking",
        conversation_id: "",
        user: "user@test",
      }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("sendMessage: conversation_idが存在しない場合はAppErrorを投げる", async () => {
    const invalidResponse = {
      answer: "テスト",
      // conversation_idがない
    };

    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(invalidResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const client = new DifyClient();

    await expect(
      client.sendMessage({
        inputs: { user_id: "user@test", department_code: "001" },
        query: "テスト",
        response_mode: "blocking",
        conversation_id: "",
        user: "user@test",
      }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("sendMessage: レスポンスがnullの場合はAppErrorを投げる", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(null), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const client = new DifyClient();

    await expect(
      client.sendMessage({
        inputs: { user_id: "user@test", department_code: "001" },
        query: "テスト",
        response_mode: "blocking",
        conversation_id: "",
        user: "user@test",
      }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("sendMessage: レスポンスが文字列の場合はAppErrorを投げる", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify("invalid"), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const client = new DifyClient();

    await expect(
      client.sendMessage({
        inputs: { user_id: "user@test", department_code: "001" },
        query: "テスト",
        response_mode: "blocking",
        conversation_id: "",
        user: "user@test",
      }),
    ).rejects.toBeInstanceOf(AppError);
  });
});
