import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { AppError } from "~/types/error";

const fetchMock = vi.fn();

vi.mock("~/lib/utils/env", () => ({
  env: {
    DIFY_API_URL: "https://dify.test/api",
    DIFY_API_KEY: "app-test-key",
    DIFY_TIMEOUT: 5000,
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
});
