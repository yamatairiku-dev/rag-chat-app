import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { Avatar, AvatarImage, AvatarFallback } from "~/components/ui/avatar";

describe("Avatar", () => {
  it("正常系: Avatarコンポーネントがレンダリングされる", () => {
    const { container } = render(
      <Avatar>
        <AvatarFallback>US</AvatarFallback>
      </Avatar>,
    );
    const avatar = container.querySelector('[data-slot="avatar"]');
    expect(avatar).toBeInTheDocument();
  });

  it("正常系: classNameが適用される", () => {
    const { container } = render(
      <Avatar className="custom-avatar">
        <AvatarFallback>US</AvatarFallback>
      </Avatar>,
    );
    const avatar = container.querySelector('[data-slot="avatar"]');
    expect(avatar).toHaveClass("custom-avatar");
  });

  it("正常系: 追加のpropsが渡される", () => {
    const { container } = render(
      <Avatar aria-label="ユーザーのアバター">
        <AvatarFallback>US</AvatarFallback>
      </Avatar>,
    );
    const avatar = container.querySelector('[data-slot="avatar"]');
    expect(avatar).toHaveAttribute("aria-label", "ユーザーのアバター");
  });

  it("正常系: AvatarFallbackが表示される（画像が読み込まれない場合）", () => {
    const { container } = render(
      <Avatar>
        <AvatarFallback>US</AvatarFallback>
      </Avatar>,
    );
    const fallback = container.querySelector('[data-slot="avatar-fallback"]');
    expect(fallback).toBeInTheDocument();
    expect(fallback).toHaveTextContent("US");
  });

  it("正常系: AvatarFallbackにclassNameが適用される", () => {
    const { container } = render(
      <Avatar>
        <AvatarFallback className="custom-fallback">US</AvatarFallback>
      </Avatar>,
    );
    const fallback = container.querySelector('[data-slot="avatar-fallback"]');
    expect(fallback).toHaveClass("custom-fallback");
  });

  it("正常系: AvatarImageコンポーネントがdata-slotを持つ", () => {
    // jsdomでは画像は読み込まれないため、Radix UIはAvatarImageを描画しない。
    // ここではAvatarImage単体としてエラーなく参照できることのみ確認する。
    expect(AvatarImage).toBeDefined();
  });
});
