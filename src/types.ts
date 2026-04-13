export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | {
      [key: string]: JsonValue;
    };

export type ViewMode = "single" | "diff";
export type ThemeMode = "light" | "dark";
export type RawRenderMode = "formatted" | "minified";
export type JsonSource = "paste" | "upload" | "drop" | null;
export type JsonNodeType =
  | "object"
  | "array"
  | "string"
  | "number"
  | "boolean"
  | "null";
export type DiffStatus = "added" | "removed" | "changed" | "unchanged";

export interface JsonErrorMeta {
  message: string;
  position?: number;
  line?: number;
  column?: number;
}

export interface JsonPaneState {
  source: JsonSource;
  rawText: string;
  parsedValue: JsonValue | null;
  normalizedValue: JsonValue | null;
  isValid: boolean;
  error: JsonErrorMeta | null;
  fileName: string | null;
}

export interface JsonMetrics {
  lines: number;
  characters: number;
  nodes: number;
  keys: number;
}

export interface TreeNode {
  kind: "tree";
  path: string;
  key: string | null;
  nodeType: JsonNodeType;
  expanded: boolean;
  depth: number;
  displayValue: string;
  value?: JsonValue;
  children?: TreeNode[];
}

export interface DiffNode {
  kind: "diff";
  path: string;
  key: string | null;
  nodeType: JsonNodeType;
  expanded: boolean;
  depth: number;
  status: DiffStatus;
  beforeValue?: JsonValue;
  afterValue?: JsonValue;
  beforeDisplay: string;
  afterDisplay: string;
  children?: DiffNode[];
}

export interface DiffSummary {
  added: number;
  removed: number;
  changed: number;
  unchanged: number;
}
