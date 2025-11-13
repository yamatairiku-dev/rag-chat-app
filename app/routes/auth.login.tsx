// app/routes/auth.login.tsx
import type { Route } from "./+types/auth.login";
import { getAuthorizationUrl } from "~/lib/auth/entra-client";
import { redirect } from "react-router";

export async function loader({}: Route.LoaderArgs) {
  try {
    console.log("[ログイン] 認証URL生成開始");
    const authUrl = await getAuthorizationUrl();
    console.log("[ログイン] 認証URL生成完了:", authUrl.substring(0, 100) + "...");
    return redirect(authUrl);
  } catch (error) {
    console.error("[ログイン] 認証URL生成エラー:", error);
    throw new Response("認証URLの生成に失敗しました", { status: 500 });
  }
}

