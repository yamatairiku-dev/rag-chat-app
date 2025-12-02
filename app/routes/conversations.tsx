import type { Route } from "./+types/conversations";
import { Form, useActionData, useLoaderData } from "react-router";
import { Header } from "~/components/layout/Header";
import type { ConversationRecord } from "~/lib/chat/conversation-store.server";
import {
  deleteConversation,
  getConversation,
  listConversationsForUser,
} from "~/lib/chat/conversation-store.server";
import { requireUserSession } from "~/lib/session/session-manager";

type LoaderData = {
  user: {
    displayName: string;
    userEmail: string;
    departmentCode: string;
    departmentName?: string;
  };
  conversations: ConversationRecord[];
};

type ActionData =
  | {
      success: true;
    }
  | {
      success: false;
      error: string;
    };

export async function loader({ request }: Route.LoaderArgs) {
  const session = await requireUserSession(request);
  const url = new URL(request.url);
  const limitParam = url.searchParams.get("limit");

  let limit = 20;
  if (limitParam) {
    const parsed = Number(limitParam);
    if (!Number.isNaN(parsed) && parsed > 0) {
      limit = Math.min(parsed, 100);
    }
  }

  const all = await listConversationsForUser(session.userId);
  const conversations = all
    .slice()
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, limit);

  return Response.json<LoaderData>({
    user: {
      displayName: session.displayName,
      userEmail: session.userEmail,
      departmentCode: session.departmentCode,
      departmentName: session.departmentName,
    },
    conversations,
  });
}

export async function action({ request }: Route.ActionArgs) {
  const session = await requireUserSession(request);
  const formData = await request.formData();

  const intent = (formData.get("action") as string | null) ?? "";
  const conversationId = (formData.get("conversation_id") as string | null)?.trim();

  if (!conversationId) {
    return Response.json<ActionData>(
      {
        success: false,
        error: "会話IDが指定されていません。",
      },
      { status: 400 },
    );
  }

  if (intent === "delete") {
    const existing = await getConversation(conversationId);
    if (!existing || existing.userId !== session.userId) {
      return Response.json<ActionData>(
        {
          success: false,
          error: "会話が見つかりません。",
        },
        { status: 404 },
      );
    }

    await deleteConversation(conversationId);

    return Response.json<ActionData>({
      success: true,
    });
  }

  return Response.json<ActionData>(
    {
      success: false,
      error: "無効なアクションです。",
    },
    { status: 400 },
  );
}

export default function Conversations() {
  const { user, conversations } = useLoaderData<LoaderData>();
  const actionData = useActionData<ActionData>();

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Header user={user} />
      <main className="container mx-auto flex w-full flex-1 flex-col px-4 py-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">会話履歴</h2>
        </div>
        <div className="flex-1 overflow-y-auto rounded-lg bg-white p-4 shadow">
          {conversations.length === 0 ? (
            <div className="flex h-full items-center justify-center text-gray-400">
              会話履歴がありません。
            </div>
          ) : (
            <div className="space-y-3">
              {conversations.map((conv) => {
                const lastMessage =
                  conv.messages[conv.messages.length - 1] ?? null;
                return (
                  <div
                    key={conv.conversationId}
                    className="flex items-start justify-between rounded border px-4 py-3 hover:bg-gray-50"
                  >
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-medium">
                        {lastMessage?.content?.slice(0, 40) || "タイトルなし"}
                      </h3>
                      <p className="mt-1 text-xs text-gray-500">
                        {new Date(conv.updatedAt).toLocaleString("ja-JP")}
                      </p>
                      {lastMessage && (
                        <p className="mt-2 line-clamp-2 text-xs text-gray-600">
                          {lastMessage.content}
                        </p>
                      )}
                    </div>
                    <div className="ml-4 flex shrink-0 flex-col items-end gap-2">
                      <Form method="get" action="/chat">
                        <input
                          type="hidden"
                          name="conversationId"
                          value={conv.conversationId}
                        />
                        <button
                          type="submit"
                          className="rounded bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700"
                        >
                          開く
                        </button>
                      </Form>
                      <Form method="post">
                        <input
                          type="hidden"
                          name="conversation_id"
                          value={conv.conversationId}
                        />
                        <input type="hidden" name="action" value="delete" />
                        <button
                          type="submit"
                          className="rounded bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700"
                          onClick={(event) => {
                            if (!confirm("この会話を削除しますか？")) {
                              event.preventDefault();
                            }
                          }}
                        >
                          削除
                        </button>
                      </Form>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {actionData && !actionData.success && (
          <p className="mt-4 text-xs text-red-600">{actionData.error}</p>
        )}
      </main>
    </div>
  );
}

