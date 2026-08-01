import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Welcome } from "~/welcome/welcome";

describe("Welcome", () => {
  it("案内リンクとロゴを表示する", () => {
    render(<Welcome />);

    expect(screen.getByText("What's next?")).toBeInTheDocument();
    expect(screen.getAllByAltText("React Router")).toHaveLength(2);
    expect(screen.getByRole("link", { name: /React Router Docs/ })).toHaveAttribute(
      "href",
      "https://reactrouter.com/docs",
    );
    expect(screen.getByRole("link", { name: /Join Discord/ })).toHaveAttribute(
      "rel",
      "noreferrer",
    );
  });
});
