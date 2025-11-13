import type { Route } from "./+types/home";
import { getSession } from "~/lib/session/session-manager";
import { redirect } from "react-router";

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request);
  
  if (session) {
    // セッションがある場合はチャット画面へ
    return redirect("/chat");
  }
  
  // セッションがない場合はログイン画面へ
  return redirect("/auth/login");
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "社内RAG検索チャットボット" },
    { name: "description", content: "社内規則・マニュアルを検索できるチャットボット" },
  ];
}

export default function Home() {
  return null; // loaderでリダイレクトされるため
}
