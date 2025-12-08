// app/routes/api.test-auth.ts
// テスト環境専用の認証エンドポイント
// 本番環境では無効化する必要があります

import type { Route } from "./+types/api.test-auth";
import { createSession } from "~/lib/session/session-manager";
import { env } from "~/lib/utils/env";

/**
 * テスト用の認証エンドポイント
 * 
 * E2Eテストで使用するための認証済みセッションを作成します。
 * 本番環境では使用しないでください。
 */
export async function action({ request }: Route.ActionArgs) {
  // テスト環境でのみ有効
  if (env.NODE_ENV === "production") {
    return Response.json({ error: "Not available in production" }, { status: 403 });
  }

  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await request.json();
    const {
      userId = "test-user-123",
      userEmail = "test@example.com",
      displayName = "テストユーザー",
      departmentCode = "001",
      departmentName = "テスト部署",
    } = body;

    // セッションを作成
    const { cookie, sessionId } = await createSession({
      userId,
      userEmail,
      displayName,
      departmentCode,
      departmentName,
      accessToken: "test-access-token",
      refreshToken: "test-refresh-token",
      tokenExpiresAt: Date.now() + 3600000, // 1時間後
    });

    return Response.json(
      {
        success: true,
        sessionId,
      },
      {
        status: 200,
        headers: {
          "Set-Cookie": cookie,
        },
      }
    );
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}





