import type { CSSProperties } from "react";
import { DiffEditor } from "@monaco-editor/react";
import { ensureMonacoTheme } from "../../lib/monacoThemes";
import type {
  JsonNodeType,
  JsonValue,
  RawRenderMode,
  ThemeMode,
  ViewMode
} from "../../types";

interface RawPreviewCardProps {
  themeMode: ThemeMode;
  viewMode: ViewMode;
  rawRenderMode: RawRenderMode;
  singleValue: string;
  singleParsedValue: JsonValue | null;
  leftValue: string;
  rightValue: string;
  ready: boolean;
  renderSideBySide: boolean;
  onCopySingle: () => void;
  onCopyLeft: () => void;
  onCopyRight: () => void;
}

export function RawPreviewCard({
  themeMode,
  viewMode,
  rawRenderMode,
  singleValue,
  singleParsedValue,
  leftValue,
  rightValue,
  ready,
  renderSideBySide,
  onCopySingle,
  onCopyLeft,
  onCopyRight
}: RawPreviewCardProps) {
  const monacoTheme =
    themeMode === "dark" ? "json-studio-dark" : "json-studio-light";

  return (
    <section className="panel viewer-card viewer-card--raw">
      <div className="viewer-card__header">
        <div>
          <div className="studio-kicker">RAW STUDIO</div>
          <h2>{viewMode === "diff" ? "Normalized Text Diff" : "Rendered JSON Canvas"}</h2>
        </div>

        <div className="viewer-card__actions">
          <span className="signal-pill">
            {rawRenderMode === "formatted" ? "Pretty 2-space mode" : "Compact mode"}
          </span>
          {viewMode === "diff" ? (
            <>
              <button type="button" className="utility-button" onClick={onCopyLeft}>
                Copy A
              </button>
              <button type="button" className="utility-button" onClick={onCopyRight}>
                Copy B
              </button>
            </>
          ) : (
            <button type="button" className="utility-button" onClick={onCopySingle}>
              Copy output
            </button>
          )}
        </div>
      </div>

      {viewMode === "diff" ? (
        <div className="raw-compare-legend">
          <div className="raw-compare-legend__pane">
            <span className="raw-compare-legend__swatch raw-compare-legend__swatch--left" />
            <div>
              <strong>JSON A</strong>
              <span>Before / original side</span>
            </div>
          </div>

          <div className="raw-compare-legend__pane">
            <span className="raw-compare-legend__swatch raw-compare-legend__swatch--right" />
            <div>
              <strong>JSON B</strong>
              <span>After / target side</span>
            </div>
          </div>

          <div className="raw-compare-legend__hint">
            Unchanged blocks are collapsed automatically so the edits stand out.
          </div>
        </div>
      ) : null}

      <div className={`raw-panel ${viewMode === "single" ? "raw-panel--canvas" : ""}`}>
        {!ready ? (
          <div className="empty-view">
            {viewMode === "diff"
              ? "Both panes need valid JSON before the raw diff can be shown."
              : "Valid JSON in pane A will be transformed into a visual canvas here."}
          </div>
        ) : viewMode === "diff" ? (
          <DiffEditor
            height="420px"
            original={leftValue}
            modified={rightValue}
            language="json"
            theme={monacoTheme}
            beforeMount={(monaco) => {
              ensureMonacoTheme(monaco, "light");
              ensureMonacoTheme(monaco, "dark");
            }}
            options={{
              renderSideBySide,
              readOnly: true,
              originalEditable: false,
              minimap: { enabled: false },
              ignoreTrimWhitespace: false,
              hideUnchangedRegions: {
                enabled: true,
                contextLineCount: 3
              },
              scrollBeyondLastLine: false,
              wordWrap: "on",
              lineNumbersMinChars: 3,
              fontSize: 14,
              fontLigatures: true
            }}
          />
        ) : singleParsedValue ? (
          <JsonCanvas value={singleParsedValue} rawRenderMode={rawRenderMode} />
        ) : null}
      </div>
    </section>
  );
}

interface JsonCanvasProps {
  value: JsonValue;
  rawRenderMode: RawRenderMode;
}

function JsonCanvas({ value, rawRenderMode }: JsonCanvasProps) {
  const rootType = getValueType(value);
  const summary = getCanvasSummary(value);
  const highlightEntries = getTopHighlights(value);
  const orbitCount = Math.min(Math.max(summary.entries, summary.depth + 2), 10);

  return (
    <div className={`json-canvas json-canvas--${rawRenderMode}`}>
      <div className="json-canvas__ribbon">
        <div className="json-canvas__ribbon-copy">
          <span className={`json-token json-token--${rootType}`}>
            {capitalize(rootType)}
          </span>
          <div>
            <strong>
              {rawRenderMode === "formatted"
                ? "Signal-rich composition view"
                : "Dense composition view"}
            </strong>
            <span>
              Designed to read like a visual data artifact instead of a plain code dump.
            </span>
          </div>
        </div>

        <div className="json-canvas__orbits" aria-hidden="true">
          {Array.from({ length: orbitCount }).map((_, index) => (
            <span key={index} className="json-canvas__orbit" />
          ))}
        </div>
      </div>

        <div className="json-canvas__summary">
        <CanvasMetric label="Root" value={capitalize(rootType)} delay={0} />
        <CanvasMetric label="Depth" value={String(summary.depth)} delay={1} />
        <CanvasMetric
          label={rootType === "array" ? "Items" : rootType === "object" ? "Keys" : "Entries"}
          value={String(summary.entries)}
          delay={2}
        />
        <CanvasMetric label="Leaf Values" value={String(summary.leaves)} delay={3} />
      </div>

      <div className="json-canvas__hero">
        <div className="json-canvas__intro">
          <span className={`json-token json-token--${rootType}`}>
            {capitalize(rootType)}
          </span>
          <h3>
            {rawRenderMode === "formatted"
              ? "Expanded visual composition"
              : "Compact visual composition"}
          </h3>
          <p>
            {rawRenderMode === "formatted"
              ? "Open top-level containers, scan the field mix, and read nested values as cards instead of plain code."
              : "A denser map of the same JSON, useful when you want the structure without a full text dump."}
          </p>
        </div>

        <div className="json-canvas__highlights">
          {highlightEntries.length > 0 ? (
            highlightEntries.map((entry, index) => (
              <div
                key={entry.label}
                className="json-highlight-card"
                style={
                  {
                    "--entry-delay": `${120 + index * 36}ms`
                  } as CSSProperties
                }
              >
                <div className="json-highlight-card__header">
                  <strong>{entry.label}</strong>
                  <span className={`json-token json-token--${entry.type}`}>
                    {entry.type}
                  </span>
                </div>
                <div className="json-highlight-card__value">{entry.preview}</div>
              </div>
            ))
          ) : (
            <div className="json-highlight-card json-highlight-card--solo">
              <div className="json-highlight-card__header">
                <strong>Value preview</strong>
                <span className={`json-token json-token--${rootType}`}>
                  {rootType}
                </span>
              </div>
              <div className="json-highlight-card__value">{formatPreview(value)}</div>
            </div>
          )}
        </div>
      </div>

      <div className="json-canvas__body">
        <JsonCanvasNode
          nodeKey={rootType === "array" ? "root array" : rootType === "object" ? "root object" : "root value"}
          value={value}
          depth={0}
          path="$"
          rawRenderMode={rawRenderMode}
        />
      </div>
    </div>
  );
}

interface JsonCanvasNodeProps {
  nodeKey: string;
  value: JsonValue;
  depth: number;
  path: string;
  rawRenderMode: RawRenderMode;
}

function JsonCanvasNode({
  nodeKey,
  value,
  depth,
  path,
  rawRenderMode
}: JsonCanvasNodeProps) {
  const nodeType = getValueType(value);
  const motionStyle = {
    "--entry-delay": `${Math.min(depth, 6) * 44}ms`
  } as CSSProperties;

  if (nodeType !== "array" && nodeType !== "object") {
    return (
      <article
        className={`json-node json-node--primitive json-node--${nodeType}`}
        style={motionStyle}
      >
        <div className="json-node__meta">
          <span className="json-node__key">{nodeKey}</span>
          <span className={`json-token json-token--${nodeType}`}>{nodeType}</span>
        </div>
        <div className="json-node__path">{path}</div>
        <div className="json-node__value">{formatPreview(value)}</div>
      </article>
    );
  }

  const entries: Array<readonly [string, JsonValue]> = Array.isArray(value)
    ? value.map((item, index) => [String(index), item] as const)
    : isObjectValue(value)
      ? Object.entries(value)
      : [];
  const preview = entries.slice(0, rawRenderMode === "formatted" ? 4 : 3);
  const shouldOpen = depth < (rawRenderMode === "formatted" ? 2 : 1);

  return (
    <details
      className={`json-node json-node--container json-node--${nodeType} ${
        depth === 0 ? "json-node--root" : ""
      }`}
      open={shouldOpen}
      style={motionStyle}
    >
      <summary className="json-node__summary">
        <div className="json-node__summary-main">
          <span className="json-node__key">{nodeKey}</span>
          <span className={`json-token json-token--${nodeType}`}>{nodeType}</span>
          <span className="json-node__count">
            {entries.length} {nodeType === "array" ? "items" : "keys"}
          </span>
          <span className="json-node__path">{path}</span>
        </div>

        <div className="json-node__preview-list">
          {preview.map(([entryKey, entryValue]) => (
            <span key={entryKey} className="json-node__preview-pill">
              <strong>{entryKey}</strong>
              <span>{formatPreview(entryValue)}</span>
            </span>
          ))}
        </div>
      </summary>

      <div
        className={`json-node__children ${
          rawRenderMode === "minified" ? "json-node__children--compact" : ""
        }`}
      >
        {entries.map(([entryKey, entryValue]) => (
          <JsonCanvasNode
            key={`${path}-${entryKey}`}
            nodeKey={entryKey}
            value={entryValue}
            depth={depth + 1}
            path={nodeType === "array" ? `${path}[${entryKey}]` : `${path}.${entryKey}`}
            rawRenderMode={rawRenderMode}
          />
        ))}
      </div>
    </details>
  );
}

function CanvasMetric({
  label,
  value,
  delay
}: {
  label: string;
  value: string;
  delay: number;
}) {
  return (
    <div
      className="canvas-metric"
      style={
        {
          "--entry-delay": `${delay * 34}ms`
        } as CSSProperties
      }
    >
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function getCanvasSummary(value: JsonValue) {
  return {
    depth: getValueDepth(value),
    entries: getEntryCount(value),
    leaves: countLeaves(value)
  };
}

function getTopHighlights(value: JsonValue) {
  if (Array.isArray(value)) {
    return value.slice(0, 6).map((item, index) => ({
      label: `[${index}]`,
      type: getValueType(item),
      preview: formatPreview(item)
    }));
  }

  if (isObjectValue(value)) {
    return Object.entries(value)
      .slice(0, 6)
      .map(([key, entryValue]) => ({
        label: key,
        type: getValueType(entryValue),
        preview: formatPreview(entryValue)
      }));
  }

  return [];
}

function getEntryCount(value: JsonValue): number {
  if (Array.isArray(value)) {
    return value.length;
  }

  if (isObjectValue(value)) {
    return Object.keys(value).length;
  }

  return 1;
}

function countLeaves(value: JsonValue): number {
  if (Array.isArray(value)) {
    return value.reduce<number>((total, item) => total + countLeaves(item), 0);
  }

  if (isObjectValue(value)) {
    return Object.values(value).reduce<number>(
      (total, item) => total + countLeaves(item),
      0
    );
  }

  return 1;
}

function getValueDepth(value: JsonValue): number {
  if (Array.isArray(value)) {
    return value.length === 0
      ? 1
      : 1 + Math.max(...value.map((item) => getValueDepth(item)));
  }

  if (isObjectValue(value)) {
    const objectValues = Object.values(value);
    return objectValues.length === 0
      ? 1
      : 1 + Math.max(...objectValues.map((item) => getValueDepth(item)));
  }

  return 1;
}

function getValueType(value: JsonValue): JsonNodeType {
  if (Array.isArray(value)) {
    return "array";
  }

  if (value === null) {
    return "null";
  }

  if (typeof value === "object") {
    return "object";
  }

  return typeof value as Exclude<JsonNodeType, "array" | "object" | "null">;
}

function formatPreview(value: JsonValue): string {
  if (Array.isArray(value)) {
    return `Array(${value.length})`;
  }

  if (isObjectValue(value)) {
    return `Object(${Object.keys(value).length})`;
  }

  if (typeof value === "string") {
    return JSON.stringify(value.length > 56 ? `${value.slice(0, 53)}...` : value);
  }

  return String(value);
}

function isObjectValue(value: JsonValue): value is Record<string, JsonValue> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
