import {
  startTransition,
  useDeferredValue,
  useEffect,
  useState
} from "react";
import type {
  DiffNode,
  DiffSummary,
  JsonPaneState,
  JsonValue,
  RawRenderMode,
  ThemeMode,
  TreeNode,
  ViewMode
} from "../../types";
import { readFileAsText } from "../../lib/file";
import {
  buildDiffTree,
  buildPaneState,
  buildTree,
  collectDiffExpandablePaths,
  collectTreeExpandablePaths,
  computeStructuralDelta,
  stringifyJsonValue,
  summarizeDiffTree
} from "../../lib/json/jsonTools";
import { JsonPaneCard } from "./components/JsonPaneCard";
import { JsonTreePanel } from "../viewer/JsonTreePanel";
import { RawPreviewCard } from "../viewer/RawPreviewCard";

const EMPTY_PANE = buildPaneState("");

function getSystemTheme(): ThemeMode {
  if (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-color-scheme: dark)").matches
  ) {
    return "dark";
  }

  return "light";
}

export function WorkbenchPage() {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => getSystemTheme());
  const [viewMode, setViewMode] = useState<ViewMode>("single");
  const [rawRenderMode, setRawRenderMode] =
    useState<RawRenderMode>("formatted");
  const [showTreePanel, setShowTreePanel] = useState(false);
  const [showOutputPanel, setShowOutputPanel] = useState(false);
  const [paneA, setPaneA] = useState<JsonPaneState>(EMPTY_PANE);
  const [paneB, setPaneB] = useState<JsonPaneState>(EMPTY_PANE);
  const [treeSearch, setTreeSearch] = useState("");
  const [expansionOverrides, setExpansionOverrides] = useState<
    Record<string, boolean>
  >({});
  const [notice, setNotice] = useState<string | null>(null);
  const [renderSideBySide, setRenderSideBySide] = useState(
    typeof window === "undefined" ? true : window.innerWidth > 1120
  );

  const previewPaneA = useDeferredValue(paneA);
  const previewPaneB = useDeferredValue(paneB);
  const previewSearch = useDeferredValue(treeSearch);

  useEffect(() => {
    document.documentElement.dataset.theme = themeMode;
    document.documentElement.style.colorScheme = themeMode;
  }, [themeMode]);

  useEffect(() => {
    const handleResize = () => {
      setRenderSideBySide(window.innerWidth > 1120);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    setExpansionOverrides({});
  }, [viewMode, previewPaneA.rawText, previewPaneB.rawText]);

  useEffect(() => {
    if (!notice) {
      return undefined;
    }

    const timeout = window.setTimeout(() => {
      setNotice(null);
    }, 2600);

    return () => window.clearTimeout(timeout);
  }, [notice]);

  const singleTree = previewPaneA.isValid
    ? buildTree(previewPaneA.parsedValue as JsonValue)
    : null;

  const diffTree =
    viewMode === "diff" && previewPaneA.isValid && previewPaneB.isValid
      ? buildDiffTree(
          previewPaneA.normalizedValue as JsonValue,
          previewPaneB.normalizedValue as JsonValue
        )
      : null;

  const treeRoot: TreeNode | DiffNode | null =
    viewMode === "diff" ? diffTree : singleTree;

  const diffSummary: DiffSummary | null = diffTree
    ? summarizeDiffTree(diffTree)
    : null;

  const structuralDelta =
    diffTree && previewPaneA.isValid && previewPaneB.isValid
      ? computeStructuralDelta(
          previewPaneA.normalizedValue as JsonValue,
          previewPaneB.normalizedValue as JsonValue
        )
      : null;

  const hasDiff = Boolean(structuralDelta);

  const singleRawPreview = previewPaneA.isValid
    ? stringifyJsonValue(
        previewPaneA.parsedValue as JsonValue,
        rawRenderMode,
        false
      )
    : "";

  const diffRawPreviewA = previewPaneA.isValid
    ? stringifyJsonValue(
        previewPaneA.normalizedValue as JsonValue,
        rawRenderMode,
        false
      )
    : "";

  const diffRawPreviewB = previewPaneB.isValid
    ? stringifyJsonValue(
        previewPaneB.normalizedValue as JsonValue,
        rawRenderMode,
        false
      )
    : "";

  const treeReady =
    viewMode === "single"
      ? previewPaneA.isValid
      : previewPaneA.isValid && previewPaneB.isValid;

  const activeExpandablePaths = treeRoot
    ? "status" in treeRoot
      ? collectDiffExpandablePaths(treeRoot)
      : collectTreeExpandablePaths(treeRoot)
    : [];

  const handlePaneChange = (
    paneKey: "A" | "B",
    rawText: string,
    source: JsonPaneState["source"] = "paste",
    fileName: string | null = null
  ) => {
    const updater = paneKey === "A" ? setPaneA : setPaneB;

    updater((previousPane) =>
      buildPaneState(
        rawText,
        source,
        fileName ?? (source === "paste" ? previousPane.fileName : null)
      )
    );
  };

  const handleTransform = (paneKey: "A" | "B", mode: RawRenderMode) => {
    const pane = paneKey === "A" ? paneA : paneB;

    if (!pane.isValid) {
      return;
    }

    const nextText = stringifyJsonValue(pane.parsedValue as JsonValue, mode);
    handlePaneChange(paneKey, nextText, pane.source, pane.fileName);
  };

  const handleCopy = async (value: string, message: string) => {
    if (!value) {
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      setNotice(message);
    } catch {
      setNotice("Clipboard access failed in this browser context.");
    }
  };

  const handleClear = (paneKey: "A" | "B") => {
    handlePaneChange(paneKey, "", null, null);
  };

  const handleFileLoad = async (
    paneKey: "A" | "B",
    file: File,
    source: "upload" | "drop"
  ) => {
    const fileText = await readFileAsText(file);
    handlePaneChange(paneKey, fileText, source, file.name);
    setNotice(`${source === "drop" ? "Dropped" : "Loaded"} ${file.name}`);
  };

  const handleSwap = () => {
    startTransition(() => {
      setPaneA(paneB);
      setPaneB(paneA);
      setNotice("Swapped JSON A and JSON B.");
    });
  };

  const handleToggleNode = (path: string, currentExpanded: boolean) => {
    setExpansionOverrides((previousOverrides) => ({
      ...previousOverrides,
      [path]: !currentExpanded
    }));
  };

  const handleExpandAll = () => {
    setExpansionOverrides(
      activeExpandablePaths.reduce<Record<string, boolean>>((accumulator, path) => {
        accumulator[path] = true;
        return accumulator;
      }, {})
    );
  };

  const handleCollapseAll = () => {
    setExpansionOverrides(
      activeExpandablePaths.reduce<Record<string, boolean>>((accumulator, path) => {
        accumulator[path] = false;
        return accumulator;
      }, {})
    );
  };

  const diffReadyMessage =
    viewMode === "single"
      ? "Single JSON mode"
      : hasDiff
        ? "Structural differences detected"
        : treeReady
          ? "JSON structures match"
          : "Compare mode";

  const activeViewerCount = Number(showTreePanel) + Number(showOutputPanel);
  const viewerPanelsLabel =
    activeViewerCount === 0
      ? "Hidden"
      : activeViewerCount === 2
        ? "Tree + Output"
        : showTreePanel
          ? "Tree"
          : "Output";

  return (
    <div className="studio-shell">
      <div className="studio-glow studio-glow--north" />
      <div className="studio-glow studio-glow--south" />

      <header className="studio-topbar panel">
        <div className="studio-heading">
          <div className="studio-kicker">DATA WORKBENCH</div>
          <div className="studio-heading__title-row">
            <JsonStudioIcon />
            <h1>Fancy JSON Studio</h1>
          </div>
          <p>
            Paste, upload, or drop JSON. Explore it as a tree, minify it for
            transport, or turn on compare mode to inspect precise structural
            differences.
          </p>
        </div>

        <div className="studio-actions">
          <div className="studio-actions__toggles">
            <ModeToggle
              label="View"
              offLabel="Single"
              onLabel="Compare"
              checked={viewMode === "diff"}
              onToggle={() =>
                setViewMode((previousMode) =>
                  previousMode === "single" ? "diff" : "single"
                )
              }
            />
            <ModeToggle
              label="Raw"
              offLabel="Pretty"
              onLabel="Compact"
              checked={rawRenderMode === "minified"}
              onToggle={() =>
                setRawRenderMode((previousMode) =>
                  previousMode === "formatted" ? "minified" : "formatted"
                )
              }
            />
            <ModeToggle
              label="Theme"
              offLabel="Light"
              onLabel="Dark"
              checked={themeMode === "dark"}
              onToggle={() =>
                setThemeMode((previousTheme) =>
                  previousTheme === "dark" ? "light" : "dark"
                )
              }
            />
          </div>

          <div className="studio-actions__utility">
            {viewMode === "diff" ? (
              <button type="button" className="utility-button utility-button--wide" onClick={handleSwap}>
                Swap JSON A and JSON B
              </button>
            ) : (
              <div className="control-note">
                Compare mode unlocks structural change tracking across both JSON panes.
              </div>
            )}
          </div>
        </div>
      </header>

      <section className="status-strip">
        <div className="status-chip">
          <span className="status-chip__label">Mode</span>
          <strong>{viewMode === "diff" ? "Compare" : "Single"}</strong>
        </div>
        <div className="status-chip">
          <span className="status-chip__label">Raw View</span>
          <strong>{rawRenderMode === "formatted" ? "Pretty 2-space" : "Compact"}</strong>
        </div>
        <div className="status-chip">
          <span className="status-chip__label">Theme</span>
          <strong>{themeMode}</strong>
        </div>
        <div className="status-chip">
          <span className="status-chip__label">Status</span>
          <strong>{diffReadyMessage}</strong>
        </div>
        <div className="status-chip">
          <span className="status-chip__label">Panels</span>
          <strong>{viewerPanelsLabel}</strong>
        </div>
        {notice ? <div className="status-chip status-chip--notice">{notice}</div> : null}
      </section>

      <main className="studio-main">
        <section
          className={`pane-grid ${
            viewMode === "diff" ? "pane-grid--two" : "pane-grid--one"
          }`}
        >
          <JsonPaneCard
            paneKey="A"
            pane={paneA}
            themeMode={themeMode}
            accent="primary"
            onChange={(value) => handlePaneChange("A", value, "paste", null)}
            onFormat={() => handleTransform("A", "formatted")}
            onMinify={() => handleTransform("A", "minified")}
            onCopy={() => handleCopy(paneA.rawText, "Copied JSON A to clipboard.")}
            onClear={() => handleClear("A")}
            onLoadFile={(file, source) => handleFileLoad("A", file, source)}
          />

          {viewMode === "diff" ? (
            <JsonPaneCard
              paneKey="B"
              pane={paneB}
              themeMode={themeMode}
              accent="secondary"
              onChange={(value) => handlePaneChange("B", value, "paste", null)}
              onFormat={() => handleTransform("B", "formatted")}
              onMinify={() => handleTransform("B", "minified")}
              onCopy={() => handleCopy(paneB.rawText, "Copied JSON B to clipboard.")}
              onClear={() => handleClear("B")}
              onLoadFile={(file, source) => handleFileLoad("B", file, source)}
            />
          ) : null}
        </section>

        <section className="panel viewer-visibility-bar">
          <div className="viewer-visibility-bar__content">
            <div>
              <div className="studio-kicker">VIEWER PANELS</div>
              <h2>Open only the views you need</h2>
            </div>

            <div className="viewer-visibility-bar__actions">
              <button
                type="button"
                aria-pressed={showTreePanel}
                className={`panel-toggle-button ${showTreePanel ? "is-active" : ""}`}
                onClick={() => setShowTreePanel((visible) => !visible)}
              >
                JSON Tree
              </button>
              <button
                type="button"
                aria-pressed={showOutputPanel}
                className={`panel-toggle-button ${showOutputPanel ? "is-active" : ""}`}
                onClick={() => setShowOutputPanel((visible) => !visible)}
              >
                Rendered Output
              </button>
            </div>
          </div>
        </section>

        {activeViewerCount === 0 ? (
          <section className="panel viewer-placeholder">
            <div className="viewer-placeholder__inner">
              <div className="studio-kicker">VIEWERS HIDDEN</div>
              <h2>Turn on a panel when you want structure or output</h2>
              <p>
                Keep the workspace focused on input while you paste, upload, or
                compare JSON. Enable `JSON Tree`, `Rendered Output`, or both when
                you’re ready to inspect the data.
              </p>
            </div>
          </section>
        ) : (
          <section
            className={`viewer-grid ${
              activeViewerCount === 1 ? "viewer-grid--single" : ""
            }`}
          >
            {showTreePanel ? (
              <JsonTreePanel
                viewMode={viewMode}
                treeRoot={treeRoot}
                ready={treeReady}
                searchValue={treeSearch}
                deferredSearchValue={previewSearch}
                expansionOverrides={expansionOverrides}
                onSearchChange={setTreeSearch}
                onToggleNode={handleToggleNode}
                onExpandAll={handleExpandAll}
                onCollapseAll={handleCollapseAll}
                summary={diffSummary}
                hasDiff={hasDiff}
              />
            ) : null}

            {showOutputPanel ? (
              <RawPreviewCard
                themeMode={themeMode}
                viewMode={viewMode}
                rawRenderMode={rawRenderMode}
                singleValue={singleRawPreview}
                singleParsedValue={
                  previewPaneA.isValid ? (previewPaneA.parsedValue as JsonValue) : null
                }
                leftValue={diffRawPreviewA}
                rightValue={diffRawPreviewB}
                ready={treeReady}
                renderSideBySide={renderSideBySide}
                onCopySingle={() =>
                  handleCopy(singleRawPreview, "Copied rendered JSON to clipboard.")
                }
                onCopyLeft={() =>
                  handleCopy(diffRawPreviewA, "Copied normalized JSON A to clipboard.")
                }
                onCopyRight={() =>
                  handleCopy(diffRawPreviewB, "Copied normalized JSON B to clipboard.")
                }
              />
            ) : null}
          </section>
        )}
      </main>
    </div>
  );
}

function JsonStudioIcon() {
  return (
    <span className="studio-title-icon" aria-hidden="true">
      <svg
        viewBox="0 0 64 64"
        className="studio-title-icon__svg"
        fill="none"
      >
        <path
          className="studio-title-icon__brace"
          d="M22 16c-4.6 0-7 2.5-7 7.4v4.3c0 3.6-1.7 5.9-5 7 3.3 1.1 5 3.4 5 7v4.3c0 4.9 2.4 7.4 7 7.4"
        />
        <path
          className="studio-title-icon__brace"
          d="M42 16c4.6 0 7 2.5 7 7.4v4.3c0 3.6 1.7 5.9 5 7-3.3 1.1-5 3.4-5 7v4.3c0 4.9-2.4 7.4-7 7.4"
        />
        <circle className="studio-title-icon__dot" cx="28" cy="24" r="2.4" />
        <circle className="studio-title-icon__dot" cx="28" cy="34" r="2.4" />
        <circle className="studio-title-icon__dot" cx="28" cy="44" r="2.4" />
        <path className="studio-title-icon__line" d="M34 24h8" />
        <path className="studio-title-icon__line" d="M34 34h6" />
        <path className="studio-title-icon__line" d="M34 44h10" />
      </svg>
    </span>
  );
}

interface ModeToggleProps {
  label: string;
  offLabel: string;
  onLabel: string;
  checked: boolean;
  onToggle: () => void;
}

function ModeToggle({
  label,
  offLabel,
  onLabel,
  checked,
  onToggle
}: ModeToggleProps) {
  return (
    <div className="mode-toggle">
      <span className="mode-toggle__label">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={`${label}: ${checked ? onLabel : offLabel}`}
        className={`mode-toggle__track ${checked ? "is-on" : ""}`}
        onClick={onToggle}
      >
        <span className={`mode-toggle__text ${!checked ? "is-active" : ""}`}>
          {offLabel}
        </span>
        <span className={`mode-toggle__text ${checked ? "is-active" : ""}`}>
          {onLabel}
        </span>
        <span className="mode-toggle__thumb" />
      </button>
    </div>
  );
}
