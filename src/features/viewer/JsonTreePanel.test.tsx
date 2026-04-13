import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { buildDiffTree, buildTree } from "../../lib/json/jsonTools";
import { JsonTreePanel } from "./JsonTreePanel";

describe("JsonTreePanel", () => {
  it("shows a helpful empty state before JSON is available", () => {
    render(
      <JsonTreePanel
        viewMode="single"
        treeRoot={null}
        ready={false}
        searchValue=""
        deferredSearchValue=""
        expansionOverrides={{}}
        onSearchChange={vi.fn()}
        onToggleNode={vi.fn()}
        onExpandAll={vi.fn()}
        onCollapseAll={vi.fn()}
        summary={null}
        hasDiff={false}
      />
    );

    expect(
      screen.getByText(/Paste, upload, or drop JSON into pane A/i)
    ).toBeInTheDocument();
  });

  it("renders diff summary chips when compare mode is active", () => {
    const diffTree = buildDiffTree(
      {
        leftOnly: true
      },
      {
        rightOnly: true
      }
    );

    render(
      <JsonTreePanel
        viewMode="diff"
        treeRoot={diffTree}
        ready
        searchValue=""
        deferredSearchValue=""
        expansionOverrides={{}}
        onSearchChange={vi.fn()}
        onToggleNode={vi.fn()}
        onExpandAll={vi.fn()}
        onCollapseAll={vi.fn()}
        summary={{ added: 1, removed: 1, changed: 0, unchanged: 0 }}
        hasDiff
      />
    );

    expect(screen.getAllByText("Added").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Removed").length).toBeGreaterThan(0);
    expect(screen.getByText("Compare focus")).toBeInTheDocument();
  });

  it("focuses compare mode on changed rows by default", () => {
    const diffTree = buildDiffTree(
      {
        same: true,
        profile: {
          region: "ap-south-1"
        }
      },
      {
        same: true,
        profile: {
          region: "us-east-1"
        }
      }
    );

    render(
      <JsonTreePanel
        viewMode="diff"
        treeRoot={diffTree}
        ready
        searchValue=""
        deferredSearchValue=""
        expansionOverrides={{}}
        onSearchChange={vi.fn()}
        onToggleNode={vi.fn()}
        onExpandAll={vi.fn()}
        onCollapseAll={vi.fn()}
        summary={{ added: 0, removed: 0, changed: 1, unchanged: 1 }}
        hasDiff
      />
    );

    expect(screen.getByText("profile")).toBeInTheDocument();
    expect(screen.queryByText("same")).not.toBeInTheDocument();
  });

  it("renders tree values in single mode", () => {
    const tree = buildTree({
      service: {
        region: "ap-south-1"
      }
    });

    render(
      <JsonTreePanel
        viewMode="single"
        treeRoot={tree}
        ready
        searchValue=""
        deferredSearchValue=""
        expansionOverrides={{}}
        onSearchChange={vi.fn()}
        onToggleNode={vi.fn()}
        onExpandAll={vi.fn()}
        onCollapseAll={vi.fn()}
        summary={null}
        hasDiff={false}
      />
    );

    expect(screen.getByText("service")).toBeInTheDocument();
    expect(screen.getByText("region")).toBeInTheDocument();
    expect(screen.getByText('"ap-south-1"')).toBeInTheDocument();
  });
});
