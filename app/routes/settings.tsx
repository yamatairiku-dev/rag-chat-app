import type { Route } from "./+types/settings";
import { Form, useLoaderData } from "react-router";
import { Header } from "~/components/layout/Header";
import { requireUserSession } from "~/lib/session/session-manager";
import { env } from "~/lib/utils/env";

type LoaderData = {
  user: {
    displayName: string;
    userEmail: string;
    departmentCodes: string[];
    departmentNames: string[];
  };
  appTitle: string;
};

export async function loader({ request }: Route.LoaderArgs) {
  const session = await requireUserSession(request);

  const data: LoaderData = {
    user: {
      displayName: session.displayName,
      userEmail: session.userEmail,
      departmentCodes: session.departmentCodes,
      departmentNames: session.departmentNames,
    },
    appTitle: env.APP_TITLE,
  };
  return Response.json(data);
}

export default function Settings() {
  const { user, appTitle } = useLoaderData<LoaderData>();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header user={user} appTitle={appTitle} />
      <main className="container mx-auto flex w-full flex-1 flex-col px-4 py-6">
        <div className="mx-auto w-full max-w-2xl space-y-6">
          <section className="rounded-lg border border-border bg-card p-6 shadow">
            <h2 className="mb-4 text-lg font-semibold text-foreground">ユーザー情報</h2>
            <dl className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">表示名</dt>
                <dd className="mt-1 text-foreground">{user.displayName}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">メールアドレス</dt>
                <dd className="mt-1 text-foreground">{user.userEmail}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">所属部署</dt>
                <dd className="mt-1 text-foreground">
                  {user.departmentNames.length > 0 ? user.departmentNames.join(" / ") : "未設定"}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-lg border border-border bg-card p-6 shadow">
            <h2 className="mb-4 text-lg font-semibold text-foreground">アカウント</h2>
            <Form method="post" action="/auth/logout">
              <button
                type="submit"
                className="rounded bg-destructive px-4 py-2 text-sm font-semibold text-white hover:bg-destructive/90"
              >
                ログアウト
              </button>
            </Form>
          </section>
        </div>
      </main>
    </div>
  );
}

