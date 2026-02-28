// app/routes/auth.login.tsx
import type { Route } from "./+types/auth.login";
import { getAuthorizationUrl } from "~/lib/auth/entra-client";
import { redirect } from "react-router";
import { getSession } from "~/lib/session/session-manager";

export async function loader({ request }: Route.LoaderArgs) {
  // 既にログインしている場合はチャット画面へリダイレクト
  const session = await getSession(request);
  if (session) {
    return redirect("/chat");
  }

  // クエリパラメータでaction=redirectが指定されている場合のみEntra IDにリダイレクト
  const url = new URL(request.url);
  const action = url.searchParams.get("action");
  
  if (action === "redirect") {
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

  // デフォルトではログインページを表示
  return null;
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "ログイン - 社内RAG検索チャットボット" },
    {
      name: "description",
      content: "社内規則・マニュアルを検索できるチャットボットにログイン",
    },
  ];
}

export default function Login() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-card p-8 shadow border border-border">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold text-foreground">
            社内RAG検索チャットボット
          </h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            社内規則・マニュアルを検索できます
          </p>
        </div>
        <form method="get" action="/auth/login">
          <input type="hidden" name="action" value="redirect" />
          <button
            type="submit"
            className="group relative flex w-full justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            ログイン
          </button>
        </form>
      </div>
    </div>
  );
}

