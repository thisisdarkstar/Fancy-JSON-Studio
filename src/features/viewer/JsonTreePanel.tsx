import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import type {
  DiffNode,
  DiffStatus,
  DiffSummary,
  TreeNode,
  ViewMode
} from "../../types";
import {
  filterDiffTree,
  filterDiffTreeByStatus,
  filterTree
} from "../../lib/json/jsonTools";

type CompareFilter = "changes" | "added" | "removed" | "all";

const compareFilterConfig: Array<{
  value: CompareFilter;
  label: string;
  statuses: DiffStatus[];
}> = [
  {
    value: "changes",
    label: "Changes",
    statuses: ["added", "removed", "changed"]
  },
  {
    value: "added",
    label: "Added",
    statuses: ["added"]
  },
  {
    value: "removed",
    label: "Removed",
    statuses: ["removed"]
  },
  {
    value: "all",
    label: "All",
    statuses: ["added", "removed", "changed", "unchanged"]
  }
];

interface JsonTreePanelProps {
  viewMode: ViewMode;
  treeRoot: TreeNode | DiffNode | null;
  ready: boolean;
  searchValue: string;
  deferredSearchValue: string;
  expansionOverrides: Record<string, boolean>;
  onSearchChange: (value: string) => void;
  onToggleNode: (path: string, currentExpanded: boolean) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  summary: DiffSummary | null;
  hasDiff: boolean;
}

export function JsonTreePanel({
  viewMode,
  treeRoot,
  ready,
  searchValue,
  deferredSearchValue,
  expansionOverrides,
  onSearchChange,
  onToggleNode,
  onExpandAll,
  onCollapseAll,
  summary,
  hasDiff
}: JsonTreePanelProps) {
  const [compareFilter, setCompareFilter] = useState<CompareFilter>("changes");

  useEffect(() => {
    if (viewMode === "diff") {
      setCompareFilter("changes");
    }
  }, [viewMode]);

  const diffFilterStatuses =
    compareFilterConfig.find((item) => item.value === compareFilter)?.statuses ??
    compareFilterConfig[0].statuses;

  const statusFilteredTree =
    treeRoot && viewMode === "diff"
      ? compareFilter === "all"
        ? (treeRoot as DiffNode)
        : filterDiffTreeByStatus(
            treeRoot as DiffNode,
            new Set<DiffStatus>(diffFilterStatuses)
          )
      : treeRoot;

  const filteredTree =
    treeRoot && viewMode === "single"
      ? filterTree(treeRoot as TreeNode, deferredSearchValue)
      : statusFilteredTree && viewMode === "diff"
        ? filterDiffTree(statusFilteredTree as DiffNode, deferredSearchValue)
        : null;
  const singleTreeStats =
    viewMode === "single" && treeRoot ? summarizeSingleTree(treeRoot as TreeNode) : null;

  const compareHint = hasDiff
    ? compareFilter === "changes"
      ? "Focused on changed paths so you can spot the signal first."
      : `Showing ${compareFilter} nodes only.`
    : "No structural changes found. Switch to All if you want to inspect matching structure.";

  const compareEmptyMessage = !treeRoot
    ? "Add valid JSON to both panes to activate the structural diff tree."
    : !ready
      ? "Fix any invalid JSON before the compare tree can be rendered."
      : !hasDiff && compareFilter !== "all"
        ? "The two JSON documents match. Switch the filter to All to inspect the shared structure."
        : deferredSearchValue.trim()
          ? "No compare rows match the current search filter."
          : `No ${compareFilter} rows are present in this comparison.`;

  return (
    <section className="panel viewer-card viewer-card--tree">
      <div className="viewer-card__header">
        <div>
          <div className="studio-kicker">VISUAL TREE</div>
          <h2>{viewMode === "diff" ? "Structural Diff Explorer" : "JSON Tree Explorer"}</h2>
        </div>

        <div className="viewer-card__actions">
          <input
            type="search"
            className="search-field"
            placeholder="Filter keys or values"
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
          />
          <button type="button" className="utility-button" onClick={onExpandAll}>
            Expand all
          </button>
          <button type="button" className="utility-button" onClick={onCollapseAll}>
            Collapse all
          </button>
        </div>
      </div>

      {viewMode === "diff" ? (
        <>
          <div className="compare-overview">
            <SummaryCard
              label="Added"
              value={summary?.added ?? 0}
              tone="added"
            />
            <SummaryCard
              label="Removed"
              value={summary?.removed ?? 0}
              tone="removed"
            />
            <SummaryCard
              label="Changed"
              value={summary?.changed ?? 0}
              tone="changed"
            />
            <SummaryCard
              label="Unchanged"
              value={summary?.unchanged ?? 0}
              tone="unchanged"
            />
          </div>

          <div className="compare-toolbar">
            <div className="compare-filter-group" role="tablist" aria-label="Compare filter">
              {compareFilterConfig.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  className={`filter-chip ${
                    compareFilter === filter.value ? "is-active" : ""
                  }`}
                  onClick={() => setCompareFilter(filter.value)}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <div className="compare-hint">
              <strong>{hasDiff ? "Compare focus" : "No changes"}</strong>
              <span>{compareHint}</span>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="tree-studio-banner">
            <div className="tree-studio-banner__copy">
              <span className={`json-token json-token--${singleTreeStats?.rootType ?? "object"}`}>
                {singleTreeStats ? formatNodeType(singleTreeStats.rootType) : "Tree"}
              </span>
              <strong>Layered structure atlas</strong>
              <span>
                Follow nested keys like a path map. Containers open to depth 2 so the
                hierarchy stays readable before you dive deeper.
              </span>
            </div>

            <div className="tree-studio-banner__sparkline" aria-hidden="true">
              {Array.from({ length: Math.min(singleTreeStats?.leaves ?? 4, 10) }).map(
                (_, index) => (
                  <span key={index} className="tree-spark" />
                )
              )}
            </div>
          </div>

          <div className="tree-insights">
            <TreeInsightCard
              label="Containers"
              value={String(singleTreeStats?.containers ?? 0)}
              tone="object"
            />
            <TreeInsightCard
              label="Leaf Values"
              value={String(singleTreeStats?.leaves ?? 0)}
              tone="string"
            />
            <TreeInsightCard
              label="Max Depth"
              value={String(singleTreeStats?.maxDepth ?? 0)}
              tone="array"
            />
          </div>
        </>
      )}

      <div className={`tree-panel ${viewMode === "diff" ? "tree-panel--compare" : ""}`}>
        {viewMode === "diff" && ready ? (
          <div className="compare-table-head">
            <span>Path</span>
            <span>Status</span>
            <span>JSON A</span>
            <span>JSON B</span>
          </div>
        ) : null}

        {!treeRoot ? (
          <div className="empty-view">
            {viewMode === "diff"
              ? "Add valid JSON to both panes to activate the structural diff tree."
              : "Paste, upload, or drop JSON into pane A to start exploring the tree."}
          </div>
        ) : !ready ? (
          <div className="empty-view">
            {viewMode === "diff"
              ? "Fix any invalid JSON before the compare tree can be rendered."
              : "Fix the JSON in pane A to unlock the tree view."}
          </div>
        ) : !filteredTree ? (
          <div className="empty-view">
            {viewMode === "diff"
              ? compareEmptyMessage
              : "No nodes match the current search filter."}
          </div>
        ) : viewMode === "single" ? (
          <TreeBranch
            node={filteredTree as TreeNode}
            searchActive={Boolean(deferredSearchValue.trim())}
            expansionOverrides={expansionOverrides}
            onToggleNode={onToggleNode}
          />
        ) : (
          <DiffBranch
            node={filteredTree as DiffNode}
            searchActive={Boolean(deferredSearchValue.trim())}
            expansionOverrides={expansionOverrides}
            onToggleNode={onToggleNode}
          />
        )}
      </div>
    </section>
  );
}

interface TreeBranchProps {
  node: TreeNode;
  searchActive: boolean;
  expansionOverrides: Record<string, boolean>;
  onToggleNode: (path: string, currentExpanded: boolean) => void;
}

function TreeBranch({
  node,
  searchActive,
  expansionOverrides,
  onToggleNode
}: TreeBranchProps) {
  const hasChildren = Boolean(node.children?.length);
  const isExpanded = searchActive
    ? true
    : expansionOverrides[node.path] ?? node.expanded;
  const rowStyle = {
    paddingLeft: `${node.depth * 18 + 12}px`,
    "--entry-delay": `${Math.min(node.depth, 6) * 32}ms`
  } as CSSProperties;

  return (
    <div className="tree-branch">
      <div className={`tree-row tree-row--single tree-row--${node.nodeType}`} style={rowStyle} title={node.path}>
        {hasChildren ? (
          <button
            type="button"
            className="tree-toggle"
            onClick={() => onToggleNode(node.path, isExpanded)}
          >
            {isExpanded ? "−" : "+"}
          </button>
        ) : (
          <span className="tree-toggle tree-toggle--ghost">•</span>
        )}
        <div className="tree-row__identity">
          <span className="tree-key">{node.key ?? "$"}</span>
          <span className="tree-row__path-text tree-row__path-text--single">
            {node.path}
          </span>
        </div>
        <span className={`tree-type tree-type--${node.nodeType}`}>{node.nodeType}</span>
        <span className="tree-value">{node.displayValue}</span>
      </div>

      {hasChildren && isExpanded
        ? node.children?.map((child) => (
            <TreeBranch
              key={child.path}
              node={child}
              searchActive={searchActive}
              expansionOverrides={expansionOverrides}
              onToggleNode={onToggleNode}
            />
          ))
        : null}
    </div>
  );
}

interface DiffBranchProps {
  node: DiffNode;
  searchActive: boolean;
  expansionOverrides: Record<string, boolean>;
  onToggleNode: (path: string, currentExpanded: boolean) => void;
}

function DiffBranch({
  node,
  searchActive,
  expansionOverrides,
  onToggleNode
}: DiffBranchProps) {
  const hasChildren = Boolean(node.children?.length);
  const isExpanded = searchActive
    ? true
    : expansionOverrides[node.path] ?? node.expanded;
  const rowStyle = {
    "--entry-delay": `${Math.min(node.depth, 6) * 32}ms`
  } as CSSProperties;
  const pathStyle = {
    paddingLeft: `${node.depth * 18 + 12}px`
  } as CSSProperties;

  return (
    <div className="tree-branch">
      <div className={`tree-row tree-row--diff tree-row--${node.status}`} style={rowStyle} title={node.path}>
        <div className="compare-row__path">
          <div className="compare-row__path-inner" style={pathStyle}>
            {hasChildren ? (
              <button
                type="button"
                className="tree-toggle"
                onClick={() => onToggleNode(node.path, isExpanded)}
              >
                {isExpanded ? "−" : "+"}
              </button>
            ) : (
              <span className="tree-toggle tree-toggle--ghost">•</span>
            )}

            <div className="compare-row__identity">
              <span className="tree-key">{node.key ?? "$"}</span>
              <span className="compare-row__path-text">{node.path}</span>
            </div>
          </div>
        </div>

        <div className="compare-row__status">
          <span className={`signal-pill signal-pill--${node.status}`}>
            {formatStatus(node.status)}
          </span>
        </div>

        <div className={`compare-cell compare-cell--before compare-cell--${node.status}`}>
          {node.beforeDisplay}
        </div>

        <div className={`compare-cell compare-cell--after compare-cell--${node.status}`}>
          {node.afterDisplay}
        </div>
      </div>

      {hasChildren && isExpanded
        ? node.children?.map((child) => (
            <DiffBranch
              key={child.path}
              node={child}
              searchActive={searchActive}
              expansionOverrides={expansionOverrides}
              onToggleNode={onToggleNode}
            />
          ))
        : null}
    </div>
  );
}

function formatStatus(status: DiffStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

interface SummaryCardProps {
  label: string;
  value: number;
  tone: "added" | "removed" | "changed" | "unchanged";
}

function SummaryCard({ label, value, tone }: SummaryCardProps) {
  return (
    <div className={`summary-card summary-card--${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

interface TreeInsightCardProps {
  label: string;
  value: string;
  tone: "object" | "array" | "string";
}

function TreeInsightCard({ label, value, tone }: TreeInsightCardProps) {
  return (
    <div className={`tree-insight-card tree-insight-card--${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function summarizeSingleTree(node: TreeNode) {
  let containers = 0;
  let leaves = 0;
  let maxDepth = 0;

  const visit = (currentNode: TreeNode) => {
    maxDepth = Math.max(maxDepth, currentNode.depth);

    if (currentNode.children?.length) {
      containers += 1;
      currentNode.children.forEach(visit);
      return;
    }

    leaves += 1;
  };

  visit(node);

  return {
    rootType: node.nodeType,
    containers,
    leaves,
    maxDepth
  };
}

function formatNodeType(nodeType: string) {
  return nodeType.charAt(0).toUpperCase() + nodeType.slice(1);
}
