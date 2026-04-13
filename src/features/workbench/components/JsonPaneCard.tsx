import { Editor } from "@monaco-editor/react";
import { useRef, useState } from "react";
import type { editor as MonacoEditor } from "monaco-editor";
import { useDropzone } from "react-dropzone";
import { ensureMonacoTheme } from "../../../lib/monacoThemes";
import { formatJsonError, getJsonMetrics } from "../../../lib/json/jsonTools";
import type { JsonPaneState, ThemeMode } from "../../../types";

interface JsonPaneCardProps {
  paneKey: "A" | "B";
  pane: JsonPaneState;
  themeMode: ThemeMode;
  accent: "primary" | "secondary";
  onChange: (value: string) => void;
  onFormat: () => void;
  onMinify: () => void;
  onCopy: () => void;
  onClear: () => void;
  onLoadFile: (file: File, source: "upload" | "drop") => Promise<void>;
}

export function JsonPaneCard({
  paneKey,
  pane,
  themeMode,
  accent,
  onChange,
  onFormat,
  onMinify,
  onCopy,
  onClear,
  onLoadFile
}: JsonPaneCardProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const [isEditorFocused, setIsEditorFocused] = useState(false);
  const metrics = getJsonMetrics(
    pane.rawText,
    pane.isValid ? pane.parsedValue : undefined
  );

  const { getRootProps, isDragActive } = useDropzone({
    noClick: true,
    multiple: false,
    accept: {
      "application/json": [".json"],
      "text/plain": [".txt", ".json"]
    },
    onDrop: async (acceptedFiles) => {
      const [file] = acceptedFiles;
      if (!file) {
        return;
      }

      await onLoadFile(file, "drop");
    }
  });

  const monacoTheme =
    themeMode === "dark" ? "json-studio-dark" : "json-studio-light";

  return (
    <section
      {...getRootProps()}
      className={`panel pane-card pane-card--${accent} ${
        isDragActive ? "is-drag-active" : ""
      }`}
    >
      <div className="pane-card__header">
        <div>
          <div className="studio-kicker">JSON {paneKey}</div>
          <h2>{paneKey === "A" ? "Source" : "Target"} Pane</h2>
        </div>
        <div className="pane-card__meta">
          <span className={`signal-pill ${pane.isValid ? "is-valid" : "is-idle"}`}>
            {pane.isValid ? "Valid JSON" : pane.rawText ? "Needs Fixing" : "Waiting"}
          </span>
          {pane.source ? <span className="signal-pill">{pane.source}</span> : null}
          {pane.fileName ? <span className="signal-pill">{pane.fileName}</span> : null}
        </div>
      </div>

      <div className="pane-card__toolbar">
        <button
          type="button"
          className="utility-button"
          onClick={() => fileInputRef.current?.click()}
        >
          Upload
        </button>
        <button
          type="button"
          className="utility-button"
          onClick={onFormat}
          disabled={!pane.isValid}
        >
          Format
        </button>
        <button
          type="button"
          className="utility-button"
          onClick={onMinify}
          disabled={!pane.isValid}
        >
          Minify
        </button>
        <button
          type="button"
          className="utility-button"
          onClick={onCopy}
          disabled={!pane.rawText}
        >
          Copy
        </button>
        <button
          type="button"
          className="utility-button"
          onClick={onClear}
          disabled={!pane.rawText}
        >
          Clear
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.txt,application/json,text/plain"
        className="sr-only"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (!file) {
            return;
          }

          await onLoadFile(file, "upload");
          event.currentTarget.value = "";
        }}
      />

      <div
        className={`pane-card__editor ${!pane.rawText ? "is-empty" : ""} ${
          isEditorFocused ? "is-focused" : ""
        }`}
      >
        {!pane.rawText ? (
          <button
            type="button"
            className="editor-empty-state"
            onClick={() => editorRef.current?.focus()}
          >
            <span className="editor-empty-state__eyebrow">
              {isEditorFocused ? "Ready To Paste" : "Paste Zone"}
            </span>
            <strong>Paste JSON here</strong>
            <span>
              {isEditorFocused
                ? "Editor active. Paste now, or drop a `.json` file into the pane."
                : "Click anywhere in this space and paste, or drag a `.json` file into the pane."}
            </span>
          </button>
        ) : null}
        <Editor
          height="360px"
          defaultLanguage="json"
          value={pane.rawText}
          theme={monacoTheme}
          beforeMount={(monaco) => {
            ensureMonacoTheme(monaco, "light");
            ensureMonacoTheme(monaco, "dark");
          }}
          options={{
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: "on",
            lineNumbersMinChars: 3,
            padding: {
              top: 16,
              bottom: 16
            },
            fontSize: 14,
            fontLigatures: true
          }}
          onMount={(editor) => {
            editorRef.current = editor;
            editor.onDidFocusEditorText(() => {
              setIsEditorFocused(true);
            });
            editor.onDidBlurEditorText(() => {
              setIsEditorFocused(false);
            });
          }}
          onChange={(value) => onChange(value ?? "")}
        />
      </div>

      <div className="pane-card__footer">
        <div className="metric-chip">
          <span>Lines</span>
          <strong>{metrics.lines}</strong>
        </div>
        <div className="metric-chip">
          <span>Chars</span>
          <strong>{metrics.characters}</strong>
        </div>
        <div className="metric-chip">
          <span>Nodes</span>
          <strong>{metrics.nodes}</strong>
        </div>
        <div className="metric-chip">
          <span>Keys</span>
          <strong>{metrics.keys}</strong>
        </div>
      </div>

      {pane.error ? (
        <div className="error-banner">{formatJsonError(pane.error)}</div>
      ) : (
        <div className="drop-hint">
          {isDragActive
            ? "Drop the file to load it into this pane."
            : "Drag and drop a JSON file anywhere inside this card."}
        </div>
      )}
    </section>
  );
}
