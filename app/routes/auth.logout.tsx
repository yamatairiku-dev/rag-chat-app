// app/routes/auth.logout.tsx
import type { Route } from "./+types/auth.logout";
import { redirect } from "react-router";
import { deleteSession } from "~/lib/session/session-manager";
import { env } from "~/lib/utils/env";

export async function action({ request }: Route.ActionArgs) {
  const clearCookie = await deleteSession(request);

  return redirect(env.ENTRA_POST_LOGOUT_REDIRECT_URI || "/login", {
    headers: { "Set-Cookie": clearCookie || "session=; Path=/; Max-Age=0" },
  });
}

