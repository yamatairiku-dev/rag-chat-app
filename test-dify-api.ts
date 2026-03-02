#!/usr/bin/env tsx
/**
 * Dify API接続テストスクリプト
 * 
 * 使用方法:
 *   tsx test-dify-api.ts
 * 
 * 環境変数:
 *   DIFY_API_URL - Dify APIのベースURL（例: https://your-dify.com/v1）
 *   DIFY_API_KEY - Dify APIキー（例: app-xxxxxxxx）
 */

import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// .envファイルを明示的に読み込む
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envResult = config({ path: join(__dirname, ".env") });

// 環境変数が読み込まれたことを確認
if (envResult.error) {
  console.error("❌ .envファイルの読み込みに失敗しました:", envResult.error);
  process.exit(1);
}

// DifyClientを直接インスタンス化（env.tsを使わない）
import { DifyClient } from "./app/lib/dify/client.js";

// 環境変数を直接取得
const DIFY_API_URL = process.env.DIFY_API_URL;
const DIFY_API_KEY = process.env.DIFY_API_KEY;
const DIFY_TIMEOUT = parseInt(process.env.DIFY_TIMEOUT || "30000", 10);

async function testDifyConnection() {
  console.log("=".repeat(60));
  console.log("Dify API接続テスト");
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

  // エンドポイントURLの確認
  const client = new DifyClient(DIFY_API_URL, DIFY_API_KEY);
  const testUrl = `${DIFY_API_URL.replace(/\/$/, "")}/chat-messages`;
  console.log("🔗 接続先URL:");
  console.log(`  ${testUrl}`);
  console.log();

  // テストリクエストの準備
  const testRequest = {
    inputs: {
      user_id: "test@example.com",
      department_names: "001",
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

    // ストリーミングモードでテスト
    let eventCount = 0;
    let hasError = false;
    let errorMessage = "";

    for await (const event of client.streamMessage(testRequest)) {
      eventCount++;
      if (event.event === "error") {
        hasError = true;
        errorMessage = typeof event.message === "string" ? event.message : "Unknown error";
        console.log(`❌ エラーイベントを受信:`, event);
        break;
      } else if (event.event === "message") {
        console.log(`✅ メッセージイベントを受信 (${eventCount}件目):`, {
          event: event.event,
          answer: event.answer?.substring(0, 50) + (event.answer && event.answer.length > 50 ? "..." : ""),
          conversation_id: event.conversation_id,
        });
      } else if (event.event === "message_end") {
        console.log(`✅ メッセージ終了イベントを受信:`, {
          event: event.event,
          conversation_id: event.conversation_id,
        });
        break;
      }
    }

    console.log();
    if (hasError) {
      console.log("❌ テスト失敗:");
      console.log(`  エラー: ${errorMessage}`);
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
      if ("code" in error) {
        console.log(`  エラーコード: ${(error as any).code}`);
      }
      if ("statusCode" in error) {
        console.log(`  HTTPステータス: ${(error as any).statusCode}`);
      }
      if (error.stack) {
        console.log();
        console.log("  スタックトレース:");
        console.log(error.stack.split("\n").slice(0, 5).join("\n"));
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

