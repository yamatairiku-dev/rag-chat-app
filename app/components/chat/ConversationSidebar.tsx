import { MessageSquare, PanelLeft, Plus } from "lucide-react";
import { Link } from "react-router";
import type { ConversationSummary } from "~/types/chat";

interface ConversationSidebarProps {
  conversations: ConversationSummary[];
  activeConversationId?: string;
  onNewConversation: () => void;
}

function formatUpdatedAt(updatedAt: number): string {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(updatedAt));
}

function ConversationList({
  conversations,
  activeConversationId,
  onNewConversation,
}: ConversationSidebarProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col p-3">
      <Link
        to="/chat"
        onClick={onNewConversation}
        className="mb-4 flex items-center gap-2 rounded-lg border border-sidebar-border bg-sidebar px-3 py-2 text-sm font-medium text-sidebar-foreground transition hover:bg-sidebar-accent"
      >
        <Plus className="size-4" aria-hidden="true" />
        新しいチャット
      </Link>

      <p className="mb-2 px-2 text-xs font-semibold text-muted-foreground">
        会話履歴
      </p>
      <nav
        className="min-h-0 flex-1 space-y-1 overflow-y-auto"
        aria-label="会話履歴"
      >
        {conversations.length === 0 ? (
          <p className="px-2 py-4 text-sm text-muted-foreground">
            会話履歴がありません。
          </p>
        ) : (
          conversations.map((conversation) => {
            const isActive =
              conversation.conversationId === activeConversationId;

            return (
              <Link
                key={conversation.conversationId}
                to={`/chat?conversationId=${encodeURIComponent(conversation.conversationId)}`}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm transition ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/70"
                }`}
              >
                <MessageSquare
                  className="mt-0.5 size-4 shrink-0"
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">
                    {conversation.title}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {formatUpdatedAt(conversation.updatedAt)}
                  </span>
                </span>
              </Link>
            );
          })
        )}
      </nav>
    </div>
  );
}

export function ConversationSidebar(props: ConversationSidebarProps) {
  return (
    <>
      <details className="border-b border-sidebar-border bg-sidebar md:hidden">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium text-sidebar-foreground">
          <PanelLeft className="size-4" aria-hidden="true" />
          会話履歴を表示
        </summary>
        <div className="max-h-80 border-t border-sidebar-border">
          <ConversationList {...props} />
        </div>
      </details>

      <aside className="hidden w-72 shrink-0 border-r border-sidebar-border bg-sidebar md:flex">
        <ConversationList {...props} />
      </aside>
    </>
  );
}
