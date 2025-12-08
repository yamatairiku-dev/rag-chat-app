// app/routes/auth.logout.tsx
import type { Route } from "./+types/auth.logout";
import { redirect } from "react-router";
import { deleteSession } from "~/lib/session/session-manager";

export async function action({ request }: Route.ActionArgs) {
  const clearCookie = await deleteSession(request);

  // ログアウト後はログインページにリダイレクト（自動的にEntra IDにリダイレクトしない）
  return redirect("/auth/login", {
    headers: { "Set-Cookie": clearCookie || "session=; Path=/; Max-Age=0" },
  });
}

