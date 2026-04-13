import type * as Monaco from "monaco-editor";
import type { ThemeMode } from "../types";

const themeState = {
  lightRegistered: false,
  darkRegistered: false
};

export function ensureMonacoTheme(
  monaco: typeof Monaco,
  themeMode: ThemeMode
): string {
  if (themeMode === "dark" && !themeState.darkRegistered) {
    monaco.editor.defineTheme("json-studio-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "string.key.json", foreground: "8cd1ff" },
        { token: "string.value.json", foreground: "ffe08a" },
        { token: "number.json", foreground: "7ef0bf" }
      ],
      colors: {
        "editor.background": "#111827",
        "editor.foreground": "#f3f6ff",
        "editorLineNumber.foreground": "#60708e",
        "editor.selectionBackground": "#24445f",
        "editor.inactiveSelectionBackground": "#1a3146",
        "editor.lineHighlightBackground": "#182235",
        "editorCursor.foreground": "#ff9a5a"
      }
    });
    themeState.darkRegistered = true;
  }

  if (themeMode === "light" && !themeState.lightRegistered) {
    monaco.editor.defineTheme("json-studio-light", {
      base: "vs",
      inherit: true,
      rules: [
        { token: "string.key.json", foreground: "005e84" },
        { token: "string.value.json", foreground: "7b4200" },
        { token: "number.json", foreground: "0c7a52" }
      ],
      colors: {
        "editor.background": "#fbfdff",
        "editor.foreground": "#132033",
        "editorLineNumber.foreground": "#8190aa",
        "editor.selectionBackground": "#d6e7ff",
        "editor.inactiveSelectionBackground": "#e6f0ff",
        "editor.lineHighlightBackground": "#eef5ff",
        "editorCursor.foreground": "#ef6c21"
      }
    });
    themeState.lightRegistered = true;
  }

  return themeMode === "dark" ? "json-studio-dark" : "json-studio-light";
}
