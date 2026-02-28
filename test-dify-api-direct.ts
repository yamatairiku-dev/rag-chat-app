#!/usr/bin/env tsx
/**
 * Dify API直接接続テストスクリプト
 * 
 * 使用方法:
 *   tsx test-dify-api-direct.ts
 */

import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// .envファイルを読み込む
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envResult = config({ path: join(__dirname, ".env") });

if (envResult.error) {
  console.error("❌ .envファイルの読み込みに失敗しました:", envResult.error);
  process.exit(1);
}

// 環境変数を取得
const DIFY_API_URL = process.env.DIFY_API_URL;
const DIFY_API_KEY = process.env.DIFY_API_KEY;
const DIFY_TIMEOUT = parseInt(process.env.DIFY_TIMEOUT || "30000", 10);

async function testDifyConnection() {
  console.log("=".repeat(60));
  console.log("Dify API接続テスト（直接接続）");
  console.log("=".repeat(60));
  console.log();

  // 環境変数の確認
  if (!DIFY_API_URL || !DIFY_API_KEY) {
    console.error("❌ 必要な環境変数が設定されていません:");
    if (!DIFY_API_URL) console.error("  - DIFY_API_URL");
    if (!DIFY_API_KEY) console.error("  - DIFY_API_KEY");
    process.exit(1);
  }

  console.log("📋 環境変数の確認:");
  console.log(`  DIFY_API_URL: ${DIFY_API_URL}`);
  console.log(`  DIFY_API_KEY: ${DIFY_API_KEY.substring(0, 10)}...${DIFY_API_KEY.substring(DIFY_API_KEY.length - 4)}`);
  console.log(`  DIFY_TIMEOUT: ${DIFY_TIMEOUT}ms`);
  console.log();

  // エンドポイントURLの構築
  const baseUrl = DIFY_API_URL.replace(/\/$/, "");
  const endpoint = `${baseUrl}/chat-messages`;
  console.log("🔗 接続先URL:");
  console.log(`  ${endpoint}`);
  console.log();

  // テストリクエストの準備
  const testRequest = {
    inputs: {
      user_id: "test@example.com",
      department_code: ["001"],
    },
    query: "こんにちは",
    response_mode: "streaming" as const,
    conversation_id: "",
    user: "test@example.com",
  };

  console.log("📤 テストリクエスト:");
  console.log(JSON.stringify(testRequest, null, 2));
  console.log();

  try {
    console.log("🚀 Dify APIへの接続テストを開始...");
    console.log();

    // リクエストヘッダー
    const headers = {
      Authorization: `Bearer ${DIFY_API_KEY}`,
      "Content-Type": "application/json",
    };

    console.log("📡 リクエスト送信:");
    console.log(`  URL: ${endpoint}`);
    console.log(`  Method: POST`);
    console.log(`  Headers: Authorization: Bearer ${DIFY_API_KEY.substring(0, 10)}...`);
    console.log();

    // fetchでリクエストを送信
    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(testRequest),
    });

    console.log("📥 レスポンス受信:");
    console.log(`  Status: ${response.status} ${response.statusText}`);
    console.log(`  Headers:`, Object.fromEntries(response.headers.entries()));
    console.log();

    if (!response.ok) {
      // エラーレスポンスを読み込む
      let errorBody: unknown;
      try {
        errorBody = await response.json();
        console.log("❌ エラーレスポンス:");
        console.log(JSON.stringify(errorBody, null, 2));
      } catch (parseError) {
        const text = await response.text();
        console.log("❌ エラーレスポンス（JSON解析失敗）:");
        console.log(text.substring(0, 500));
      }

      console.log();
      console.log("❌ テスト失敗:");
      console.log(`  HTTPステータス: ${response.status}`);
      process.exit(1);
    }

    // ストリーミングレスポンスの処理
    if (!response.body) {
      console.log("❌ レスポンスボディが空です");
      process.exit(1);
    }

    console.log("✅ ストリーミングレスポンスを受信開始...");
    console.log();

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    let eventCount = 0;
    let hasError = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split("\n\n");
      buffer = events.pop() ?? "";

      for (const eventChunk of events) {
        const dataLine = eventChunk
          .split("\n")
          .find((line) => line.startsWith("data:"));

        if (!dataLine) {
          continue;
        }

        const payload = dataLine.slice(5).trim();
        if (!payload || payload === "[DONE]") {
          continue;
        }

        try {
          const event = JSON.parse(payload);
          eventCount++;

          if (event.event === "error") {
            hasError = true;
            console.log(`❌ エラーイベントを受信:`, event);
            break;
          } else if (event.event === "message") {
            console.log(`✅ メッセージイベント (${eventCount}件目):`, {
              event: event.event,
              answer: event.answer?.substring(0, 50) + (event.answer && event.answer.length > 50 ? "..." : ""),
              conversation_id: event.conversation_id,
            });
          } else if (event.event === "message_end") {
            console.log(`✅ メッセージ終了イベント:`, {
              event: event.event,
              conversation_id: event.conversation_id,
            });
          } else {
            console.log(`ℹ️  その他のイベント (${eventCount}件目):`, event.event);
          }
        } catch (error) {
          console.log(`⚠️  イベント解析エラー:`, error instanceof Error ? error.message : String(error));
          console.log(`   生データ: ${payload.substring(0, 100)}`);
        }
      }

      if (hasError) {
        break;
      }
    }

    console.log();
    if (hasError) {
      console.log("❌ テスト失敗: エラーイベントを受信しました");
      process.exit(1);
    } else if (eventCount === 0) {
      console.log("⚠️  警告: イベントが受信されませんでした");
      process.exit(1);
    } else {
      console.log("✅ テスト成功!");
      console.log(`  受信したイベント数: ${eventCount}`);
    }
  } catch (error) {
    console.log();
    console.log("❌ テスト失敗:");
    if (error instanceof Error) {
      console.log(`  エラータイプ: ${error.constructor.name}`);
      console.log(`  エラーメッセージ: ${error.message}`);
      if (error.stack) {
        console.log();
        console.log("  スタックトレース:");
        console.log(error.stack.split("\n").slice(0, 10).join("\n"));
      }
    } else {
      console.log(`  不明なエラー: ${String(error)}`);
    }
    process.exit(1);
  }
}

// メイン処理
testDifyConnection().catch((error) => {
  console.error("予期しないエラー:", error);
  process.exit(1);
});



