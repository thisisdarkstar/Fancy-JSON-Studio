import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RawPreviewCard } from "./RawPreviewCard";

vi.mock("@monaco-editor/react", () => ({
  DiffEditor: () => <div data-testid="mock-diff-editor" />
}));

describe("RawPreviewCard", () => {
  it("renders a visual JSON canvas in single mode", () => {
    render(
      <RawPreviewCard
        themeMode="dark"
        viewMode="single"
        rawRenderMode="formatted"
        singleValue='{"name":"Ava","stats":{"score":99}}'
        singleParsedValue={{
          name: "Ava",
          stats: {
            score: 99
          }
        }}
        leftValue=""
        rightValue=""
        ready
        renderSideBySide
        onCopySingle={vi.fn()}
        onCopyLeft={vi.fn()}
        onCopyRight={vi.fn()}
      />
    );

    expect(screen.getByText("Rendered JSON Canvas")).toBeInTheDocument();
    expect(screen.getByText("Expanded visual composition")).toBeInTheDocument();
    expect(screen.getByText("Leaf Values")).toBeInTheDocument();
    expect(screen.getAllByText("stats").length).toBeGreaterThan(0);
    expect(screen.getAllByText("score").length).toBeGreaterThan(0);
  });
});
