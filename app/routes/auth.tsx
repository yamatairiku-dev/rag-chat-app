// app/routes/auth.tsx
import type { Route } from "./+types/auth";
import { redirect } from "react-router";
import { exchangeCodeForTokens } from "~/lib/auth/entra-client";
import { getUserInfo, getUserDepartment } from "~/lib/graph/user-service";
import { createSession } from "~/lib/session/session-manager";
import { AppError, ErrorCode } from "~/types/error";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  console.log("[認証コールバック] リクエスト受信:", { code: code ? "あり" : "なし", error });

  if (error) {
    console.error("[認証コールバック] エラー:", error);
    return redirect(
      `/error?title=${encodeURIComponent("認証エラー")}&message=${encodeURIComponent(`認証エラー: ${error}`)}&status=400`
    );
  }

  if (!code) {
    console.error("[認証コールバック] 認証コードが見つかりません");
    return redirect(
      `/error?title=${encodeURIComponent("認証エラー")}&message=${encodeURIComponent("認証コードが見つかりません")}&status=400`
    );
  }

  try {
    console.log("[認証コールバック] ステップ1: トークン取得開始");
    // 1. トークン取得
    const tokens = await exchangeCodeForTokens(code);
    console.log("[認証コールバック] ステップ1: トークン取得完了", { 
      hasAccessToken: !!tokens.accessToken,
      hasRefreshToken: !!tokens.refreshToken,
      expiresIn: tokens.expiresIn 
    });

    console.log("[認証コールバック] ステップ2: ユーザー情報取得開始");
    // 2. ユーザー情報取得
    const userInfo = await getUserInfo(tokens.accessToken);
    console.log("[認証コールバック] ステップ2: ユーザー情報取得完了", { 
      userId: userInfo.id,
      displayName: userInfo.displayName,
      email: userInfo.mail || userInfo.userPrincipalName 
    });

    console.log("[認証コールバック] ステップ3: 所属部署取得開始");
    // 3. 所属部署取得（正規表現にマッチするすべてを配列で取得）
    const departments = await getUserDepartment(tokens.accessToken);

    if (departments.length === 0) {
      console.error("[認証コールバック] 所属部署が見つかりません");
      console.error("[認証コールバック] 詳細は上記の[所属部署取得]ログを確認してください");
      return redirect(
        `/error?title=${encodeURIComponent("アクセス権限がありません")}&message=${encodeURIComponent("所属部署が見つかりません。アクセス権限がありません。")}&status=403`
      );
    }
    console.log("[認証コールバック] ステップ3: 所属部署取得完了", {
      count: departments.length,
      codes: departments.map((d) => d.code),
      names: departments.map((d) => d.name),
    });

    console.log("[認証コールバック] ステップ4: セッション作成開始");
    // 4. セッション作成
    const { cookie } = await createSession({
      userId: userInfo.id,
      userEmail: userInfo.mail || userInfo.userPrincipalName,
      displayName: userInfo.displayName,
      departmentCodes: departments.map((d) => d.code),
      departmentNames: departments.map((d) => d.name),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenExpiresAt: Date.now() + tokens.expiresIn * 1000,
    });
    console.log("[認証コールバック] ステップ4: セッション作成完了");

    console.log("[認証コールバック] ステップ5: チャット画面へリダイレクト");
    // 5. チャット画面へリダイレクト
    return redirect("/chat", {
      headers: { "Set-Cookie": cookie },
    });
  } catch (err) {
    console.error("認証エラー:", err);
    if (err instanceof AppError) {
      return redirect(
        `/error?title=${encodeURIComponent(err.statusCode === 403 ? "アクセス権限がありません" : "エラー")}&message=${encodeURIComponent(err.message)}&status=${err.statusCode}`
      );
    }
    return redirect(
      `/error?title=${encodeURIComponent("システムエラー")}&message=${encodeURIComponent(err instanceof Error ? err.message : "システムエラー")}&status=500`
    );
  }
}

