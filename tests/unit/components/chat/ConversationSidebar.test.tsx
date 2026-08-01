import { fireEvent, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { ConversationSidebar } from "~/components/chat/ConversationSidebar";

const conversations = [
  {
    conversationId: "conv-1",
    title: "就業規則について",
    updatedAt: new Date("2026-08-01T12:30:00+09:00").getTime(),
  },
  {
    conversationId: "conv-2",
    title: "経費精算の方法",
    updatedAt: new Date("2026-07-31T09:00:00+09:00").getTime(),
  },
];

function renderSidebar(onNewConversation = vi.fn()) {
  const router = createMemoryRouter(
    [
      {
        path: "/chat",
        element: (
          <ConversationSidebar
            conversations={conversations}
            activeConversationId="conv-1"
            onNewConversation={onNewConversation}
          />
        ),
      },
    ],
    { initialEntries: ["/chat?conversationId=conv-1"] },
  );

  render(<RouterProvider router={router} />);
  return onNewConversation;
}

describe("ConversationSidebar", () => {
  it("会話履歴と選択中の会話を表示する", () => {
    renderSidebar();

    expect(screen.getAllByText("就業規則について")).toHaveLength(2);
    expect(screen.getAllByText("経費精算の方法")).toHaveLength(2);
    expect(
      screen.getAllByRole("link", { name: /就業規則について/ })[0],
    ).toHaveAttribute("aria-current", "page");
  });

  it("履歴リンクから対象の会話を開ける", () => {
    renderSidebar();

    expect(
      screen.getAllByRole("link", { name: /経費精算の方法/ })[0],
    ).toHaveAttribute("href", "/chat?conversationId=conv-2");
  });

  it("新しいチャットの開始処理を呼び出す", () => {
    const onNewConversation = renderSidebar();

    fireEvent.click(
      screen.getAllByRole("link", { name: "新しいチャット" })[0]!,
    );

    expect(onNewConversation).toHaveBeenCalledOnce();
  });
});
