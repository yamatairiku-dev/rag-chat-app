// app/routes/error.tsx
import type { Route } from "./+types/error";
import { useLoaderData } from "react-router";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const message = url.searchParams.get("message");
  const title = url.searchParams.get("title");
  const status = url.searchParams.get("status");
  return {
    title: title ?? "エラーが発生しました",
    message:
      message ?? "予期しないエラーが発生しました。しばらく時間をおいて再度お試しください。",
    status: status ? Number(status) : null,
  };
}

export function meta({ data }: Route.MetaArgs) {
  return [{ title: `${data?.title ?? "エラー"} - 社内RAG検索チャットボット` }];
}

export default function ErrorPage() {
  const { title, message, status } = useLoaderData<Route.LoaderData>();

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-lg border border-destructive/30 bg-destructive/10 p-6 shadow-sm">
        <h1 className="mb-4 text-2xl font-bold text-destructive">{title}</h1>
        <p className="mb-4 text-foreground">{message}</p>
        {status != null && (
          <p className="mb-4 text-sm text-muted-foreground">ステータスコード: {status}</p>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href="/"
            className="inline-block rounded bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            ホームに戻る
          </a>
          <a
            href="/auth/login"
            className="inline-block rounded border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-accent"
          >
            ログイン
          </a>
        </div>
      </div>
    </main>
  );
}
