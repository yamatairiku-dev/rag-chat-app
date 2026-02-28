import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";
import "./app.css";

// サーバーサイドでのみセッションクリーンアップを開始
if (typeof window === "undefined") {
  import("~/lib/session/cleanup").then(({ startSessionCleanup }) => {
    startSessionCleanup();
  });
}

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "エラーが発生しました";
  let details = "予期しないエラーが発生しました。しばらく時間をおいて再度お試しください。";
  let stack: string | undefined;
  let statusCode: number | undefined;

  if (isRouteErrorResponse(error)) {
    statusCode = error.status;
    const customMessage =
      typeof (error as { data?: { error?: string } }).data?.error === "string"
        ? (error as { data: { error: string } }).data.error
        : null;
    if (error.status === 404) {
      message = "ページが見つかりません";
      details = customMessage ?? "お探しのページは存在しないか、移動された可能性があります。";
    } else if (error.status === 401) {
      message = "認証が必要です";
      details = customMessage ?? "このページにアクセスするにはログインが必要です。";
    } else if (error.status === 403) {
      message = "アクセス権限がありません";
      details =
        customMessage ?? "このページにアクセスする権限がありません。";
    } else if (error.status === 500) {
      message = "サーバーエラー";
      details =
        customMessage ??
        "サーバーでエラーが発生しました。しばらく時間をおいて再度お試しください。";
    } else {
      message = `エラー (${error.status})`;
      details = customMessage ?? error.statusText ?? details;
    }
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message || details;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto max-w-2xl">
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 shadow-sm">
        <h1 className="mb-4 text-2xl font-bold text-red-900">{message}</h1>
        <p className="mb-4 text-gray-700">{details}</p>
        {statusCode && (
          <p className="mb-4 text-sm text-gray-500">
            ステータスコード: {statusCode}
          </p>
        )}
        {import.meta.env.DEV && stack && (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-semibold text-gray-700">
              詳細情報（開発環境のみ）
            </summary>
            <pre className="mt-2 w-full overflow-x-auto rounded bg-gray-100 p-4 text-xs">
              <code>{stack}</code>
            </pre>
          </details>
        )}
        <div className="mt-6">
          <a
            href="/"
            className="inline-block rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            ホームに戻る
          </a>
        </div>
      </div>
    </main>
  );
}
