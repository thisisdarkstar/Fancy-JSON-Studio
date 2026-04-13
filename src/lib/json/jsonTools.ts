import * as jsondiffpatch from "jsondiffpatch";
import type {
  DiffStatus,
  DiffNode,
  DiffSummary,
  JsonErrorMeta,
  JsonMetrics,
  JsonNodeType,
  JsonPaneState,
  JsonSource,
  JsonValue,
  RawRenderMode,
  TreeNode
} from "../../types";

const DEFAULT_EXPAND_DEPTH = 2;
const MISSING = Symbol("missing");

type ComparableValue = JsonValue | typeof MISSING;

const differ = jsondiffpatch.create({
  arrays: {
    detectMove: false,
    includeValueOnMove: false
  },
  cloneDiffValues: true
});

export function buildPaneState(
  rawText: string,
  source: JsonSource = null,
  fileName: string | null = null
): JsonPaneState {
  if (!rawText.trim()) {
    return {
      source,
      rawText,
      parsedValue: null,
      normalizedValue: null,
      isValid: false,
      error: null,
      fileName
    };
  }

  try {
    const parsedValue = JSON.parse(rawText) as JsonValue;

    return {
      source,
      rawText,
      parsedValue,
      normalizedValue: normalizeJsonValue(parsedValue),
      isValid: true,
      error: null,
      fileName
    };
  } catch (error) {
    return {
      source,
      rawText,
      parsedValue: null,
      normalizedValue: null,
      isValid: false,
      error: toJsonErrorMeta(rawText, error),
      fileName
    };
  }
}

export function formatJsonText(rawText: string): string {
  return JSON.stringify(JSON.parse(rawText), null, 2);
}

export function minifyJsonText(rawText: string): string {
  return JSON.stringify(JSON.parse(rawText));
}

export function stringifyJsonValue(
  value: JsonValue,
  renderMode: RawRenderMode,
  normalize = false
): string {
  const target = normalize ? normalizeJsonValue(value) : value;
  return renderMode === "minified"
    ? JSON.stringify(target)
    : JSON.stringify(target, null, 2);
}

export function normalizeJsonValue(value: JsonValue): JsonValue {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeJsonValue(item));
  }

  if (isJsonObject(value)) {
    return Object.keys(value)
      .sort((left, right) => left.localeCompare(right))
      .reduce<Record<string, JsonValue>>((accumulator, key) => {
        accumulator[key] = normalizeJsonValue(value[key]);
        return accumulator;
      }, {});
  }

  return value;
}

export function computeStructuralDelta(
  left: JsonValue,
  right: JsonValue
): unknown {
  return differ.diff(normalizeJsonValue(left), normalizeJsonValue(right));
}

export function buildTree(value: JsonValue): TreeNode {
  return createTreeNode(value, null, "$", 0);
}

export function buildDiffTree(left: JsonValue, right: JsonValue): DiffNode {
  return createDiffNode(
    normalizeJsonValue(left),
    normalizeJsonValue(right),
    null,
    "$",
    0
  );
}

export function collectTreeExpandablePaths(node: TreeNode): string[] {
  const paths: string[] = [];
  walkTree(node, (currentNode) => {
    if (currentNode.children?.length) {
      paths.push(currentNode.path);
    }
  });
  return paths;
}

export function collectDiffExpandablePaths(node: DiffNode): string[] {
  const paths: string[] = [];
  walkDiffTree(node, (currentNode) => {
    if (currentNode.children?.length) {
      paths.push(currentNode.path);
    }
  });
  return paths;
}

export function filterTree(node: TreeNode, query: string): TreeNode | null {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return node;
  }

  const filteredChildren =
    node.children
      ?.map((child) => filterTree(child, normalizedQuery))
      .filter((child): child is TreeNode => Boolean(child)) ?? [];

  const matchesSelf = [
    node.key ?? "",
    node.path,
    node.displayValue
  ]
    .join(" ")
    .toLowerCase()
    .includes(normalizedQuery);

  if (!matchesSelf && filteredChildren.length === 0) {
    return null;
  }

  return {
    ...node,
    expanded: true,
    children: node.children ? filteredChildren : undefined
  };
}

export function filterDiffTree(node: DiffNode, query: string): DiffNode | null {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return node;
  }

  const filteredChildren =
    node.children
      ?.map((child) => filterDiffTree(child, normalizedQuery))
      .filter((child): child is DiffNode => Boolean(child)) ?? [];

  const matchesSelf = [
    node.key ?? "",
    node.path,
    node.status,
    node.beforeDisplay,
    node.afterDisplay
  ]
    .join(" ")
    .toLowerCase()
    .includes(normalizedQuery);

  if (!matchesSelf && filteredChildren.length === 0) {
    return null;
  }

  return {
    ...node,
    expanded: true,
    children: node.children ? filteredChildren : undefined
  };
}

export function filterDiffTreeByStatus(
  node: DiffNode,
  allowedStatuses: ReadonlySet<DiffStatus>
): DiffNode | null {
  const filteredChildren =
    node.children
      ?.map((child) => filterDiffTreeByStatus(child, allowedStatuses))
      .filter((child): child is DiffNode => Boolean(child)) ?? [];

  if (!allowedStatuses.has(node.status) && filteredChildren.length === 0) {
    return null;
  }

  return {
    ...node,
    expanded: filteredChildren.length > 0 ? true : node.expanded,
    children: node.children ? filteredChildren : undefined
  };
}

export function summarizeDiffTree(node: DiffNode): DiffSummary {
  const summary: DiffSummary = {
    added: 0,
    removed: 0,
    changed: 0,
    unchanged: 0
  };

  accumulateDiff(node, summary);
  return summary;
}

export function getJsonMetrics(
  rawText: string,
  parsedValue?: JsonValue | null
): JsonMetrics {
  return {
    lines: rawText ? rawText.split(/\r?\n/).length : 0,
    characters: rawText.length,
    nodes: parsedValue === undefined ? 0 : countNodes(parsedValue),
    keys: parsedValue === undefined ? 0 : countKeys(parsedValue)
  };
}

export function formatJsonError(error: JsonErrorMeta | null): string | null {
  if (!error) {
    return null;
  }

  if (error.line !== undefined && error.column !== undefined) {
    return `${error.message} (line ${error.line}, column ${error.column})`;
  }

  return error.message;
}

function createTreeNode(
  value: JsonValue,
  key: string | null,
  path: string,
  depth: number
): TreeNode {
  const nodeType = getJsonNodeType(value);

  if (Array.isArray(value)) {
    return {
      kind: "tree",
      path,
      key,
      nodeType,
      expanded: depth < DEFAULT_EXPAND_DEPTH,
      depth,
      displayValue: `Array(${value.length})`,
      value,
      children: value.map((item, index) =>
        createTreeNode(item, String(index), `${path}[${index}]`, depth + 1)
      )
    };
  }

  if (isJsonObject(value)) {
    return {
      kind: "tree",
      path,
      key,
      nodeType,
      expanded: depth < DEFAULT_EXPAND_DEPTH,
      depth,
      displayValue: `Object(${Object.keys(value).length})`,
      value,
      children: Object.keys(value).map((childKey) =>
        createTreeNode(
          value[childKey],
          childKey,
          `${path}.${escapePathSegment(childKey)}`,
          depth + 1
        )
      )
    };
  }

  return {
    kind: "tree",
    path,
    key,
    nodeType,
    expanded: depth < DEFAULT_EXPAND_DEPTH,
    depth,
    displayValue: formatInlineValue(value),
    value
  };
}

function createDiffNode(
  beforeValue: ComparableValue,
  afterValue: ComparableValue,
  key: string | null,
  path: string,
  depth: number
): DiffNode {
  const beforeMissing = beforeValue === MISSING;
  const afterMissing = afterValue === MISSING;
  const nodeValueType = getDiffNodeType(beforeValue, afterValue);

  if (beforeMissing) {
    return {
      kind: "diff",
      path,
      key,
      nodeType: nodeValueType,
      expanded: depth < DEFAULT_EXPAND_DEPTH,
      depth,
      status: "added",
      afterValue: afterValue as JsonValue,
      beforeDisplay: "—",
      afterDisplay: formatInlineValue(afterValue),
      children: buildContainerChildren(MISSING, afterValue, path, depth)
    };
  }

  if (afterMissing) {
    return {
      kind: "diff",
      path,
      key,
      nodeType: nodeValueType,
      expanded: depth < DEFAULT_EXPAND_DEPTH,
      depth,
      status: "removed",
      beforeValue: beforeValue as JsonValue,
      beforeDisplay: formatInlineValue(beforeValue),
      afterDisplay: "—",
      children: buildContainerChildren(beforeValue, MISSING, path, depth)
    };
  }

  const before = beforeValue as JsonValue;
  const after = afterValue as JsonValue;

  if (Array.isArray(before) && Array.isArray(after)) {
    const children = Array.from(
      { length: Math.max(before.length, after.length) },
      (_, index) =>
        createDiffNode(
          index < before.length ? before[index] : MISSING,
          index < after.length ? after[index] : MISSING,
          String(index),
          `${path}[${index}]`,
          depth + 1
        )
    );

    return {
      kind: "diff",
      path,
      key,
      nodeType: "array",
      expanded: depth < DEFAULT_EXPAND_DEPTH,
      depth,
      status: children.every((child) => child.status === "unchanged")
        ? "unchanged"
        : "changed",
      beforeValue: before,
      afterValue: after,
      beforeDisplay: `Array(${before.length})`,
      afterDisplay: `Array(${after.length})`,
      children
    };
  }

  if (isJsonObject(before) && isJsonObject(after)) {
    const keys = Array.from(
      new Set([...Object.keys(before), ...Object.keys(after)])
    ).sort((left, right) => left.localeCompare(right));

    const children = keys.map((childKey) =>
      createDiffNode(
        hasOwnKey(before, childKey) ? before[childKey] : MISSING,
        hasOwnKey(after, childKey) ? after[childKey] : MISSING,
        childKey,
        `${path}.${escapePathSegment(childKey)}`,
        depth + 1
      )
    );

    return {
      kind: "diff",
      path,
      key,
      nodeType: "object",
      expanded: depth < DEFAULT_EXPAND_DEPTH,
      depth,
      status: children.every((child) => child.status === "unchanged")
        ? "unchanged"
        : "changed",
      beforeValue: before,
      afterValue: after,
      beforeDisplay: `Object(${Object.keys(before).length})`,
      afterDisplay: `Object(${Object.keys(after).length})`,
      children
    };
  }

  return {
    kind: "diff",
    path,
    key,
    nodeType: nodeValueType,
    expanded: depth < DEFAULT_EXPAND_DEPTH,
    depth,
    status: deepEqualJson(before, after) ? "unchanged" : "changed",
    beforeValue: before,
    afterValue: after,
    beforeDisplay: formatInlineValue(before),
    afterDisplay: formatInlineValue(after)
  };
}

function buildContainerChildren(
  beforeValue: ComparableValue,
  afterValue: ComparableValue,
  path: string,
  depth: number
): DiffNode[] | undefined {
  if (beforeValue !== MISSING && Array.isArray(beforeValue)) {
    return beforeValue.map((item, index) =>
      createDiffNode(item, MISSING, String(index), `${path}[${index}]`, depth + 1)
    );
  }

  if (afterValue !== MISSING && Array.isArray(afterValue)) {
    return afterValue.map((item, index) =>
      createDiffNode(MISSING, item, String(index), `${path}[${index}]`, depth + 1)
    );
  }

  if (beforeValue !== MISSING && isJsonObject(beforeValue)) {
    return Object.keys(beforeValue)
      .sort((left, right) => left.localeCompare(right))
      .map((childKey) =>
        createDiffNode(
          beforeValue[childKey],
          MISSING,
          childKey,
          `${path}.${escapePathSegment(childKey)}`,
          depth + 1
        )
      );
  }

  if (afterValue !== MISSING && isJsonObject(afterValue)) {
    return Object.keys(afterValue)
      .sort((left, right) => left.localeCompare(right))
      .map((childKey) =>
        createDiffNode(
          MISSING,
          afterValue[childKey],
          childKey,
          `${path}.${escapePathSegment(childKey)}`,
          depth + 1
        )
      );
  }

  return undefined;
}

function accumulateDiff(node: DiffNode, summary: DiffSummary) {
  if (!node.children?.length) {
    if (node.status === "added") {
      summary.added += 1;
    }

    if (node.status === "removed") {
      summary.removed += 1;
    }

    if (node.status === "changed") {
      summary.changed += 1;
    }

    if (node.status === "unchanged") {
      summary.unchanged += 1;
    }

    return;
  }

  node.children.forEach((child) => accumulateDiff(child, summary));
}

function countNodes(value: JsonValue | null): number {
  if (value === null) {
    return 1;
  }

  if (Array.isArray(value)) {
    return 1 + value.reduce<number>((total, item) => total + countNodes(item), 0);
  }

  if (isJsonObject(value)) {
    return (
      1 +
      Object.values(value).reduce<number>(
        (total, item) => total + countNodes(item),
        0
      )
    );
  }

  return 1;
}

function countKeys(value: JsonValue | null): number {
  if (value === null || !isJsonObject(value)) {
    if (Array.isArray(value)) {
      return value.reduce<number>((total, item) => total + countKeys(item), 0);
    }
    return 0;
  }

  return (
    Object.keys(value).length +
    Object.values(value).reduce<number>(
      (total, item) => total + countKeys(item),
      0
    )
  );
}

function toJsonErrorMeta(rawText: string, error: unknown): JsonErrorMeta {
  const fallbackMessage = "Invalid JSON";
  const message =
    error instanceof Error && error.message ? error.message : fallbackMessage;
  const positionMatch = message.match(/position\s+(\d+)/i);
  const lineColumnMatch = message.match(/line\s+(\d+)\s+column\s+(\d+)/i);

  let position = positionMatch ? Number(positionMatch[1]) : undefined;
  let line = lineColumnMatch ? Number(lineColumnMatch[1]) : undefined;
  let column = lineColumnMatch ? Number(lineColumnMatch[2]) : undefined;

  if (position === undefined && line !== undefined && column !== undefined) {
    position = lineColumnToIndex(rawText, line, column);
  }

  if (position !== undefined && (line === undefined || column === undefined)) {
    const resolved = indexToLineColumn(rawText, position);
    line = resolved.line;
    column = resolved.column;
  }

  return {
    message,
    position,
    line,
    column
  };
}

function lineColumnToIndex(
  rawText: string,
  targetLine: number,
  targetColumn: number
): number {
  let line = 1;
  let column = 1;

  for (let index = 0; index < rawText.length; index += 1) {
    if (line === targetLine && column === targetColumn) {
      return index;
    }

    if (rawText[index] === "\n") {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
  }

  return rawText.length;
}

function indexToLineColumn(rawText: string, targetIndex: number) {
  let line = 1;
  let column = 1;

  for (let index = 0; index < Math.min(targetIndex, rawText.length); index += 1) {
    if (rawText[index] === "\n") {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
  }

  return { line, column };
}

function walkTree(node: TreeNode, visit: (node: TreeNode) => void) {
  visit(node);
  node.children?.forEach((child) => walkTree(child, visit));
}

function walkDiffTree(node: DiffNode, visit: (node: DiffNode) => void) {
  visit(node);
  node.children?.forEach((child) => walkDiffTree(child, visit));
}

function getJsonNodeType(value: JsonValue): JsonNodeType {
  if (Array.isArray(value)) {
    return "array";
  }

  if (value === null) {
    return "null";
  }

  if (isJsonObject(value)) {
    return "object";
  }

  return typeof value as Exclude<JsonNodeType, "array" | "object" | "null">;
}

function getDiffNodeType(
  beforeValue: ComparableValue,
  afterValue: ComparableValue
): JsonNodeType {
  if (beforeValue !== MISSING) {
    return getJsonNodeType(beforeValue);
  }

  return getJsonNodeType(afterValue as JsonValue);
}

function deepEqualJson(left: JsonValue, right: JsonValue): boolean {
  if (left === right) {
    return true;
  }

  if (Array.isArray(left) && Array.isArray(right)) {
    return (
      left.length === right.length &&
      left.every((item, index) => deepEqualJson(item, right[index]))
    );
  }

  if (isJsonObject(left) && isJsonObject(right)) {
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);

    return (
      leftKeys.length === rightKeys.length &&
      leftKeys.every(
        (key) => hasOwnKey(right, key) && deepEqualJson(left[key], right[key])
      )
    );
  }

  return false;
}

function formatInlineValue(value: ComparableValue): string {
  if (value === MISSING) {
    return "—";
  }

  if (Array.isArray(value)) {
    return `Array(${value.length})`;
  }

  if (isJsonObject(value)) {
    return `Object(${Object.keys(value).length})`;
  }

  if (typeof value === "string") {
    return JSON.stringify(value.length > 72 ? `${value.slice(0, 69)}...` : value);
  }

  return String(value);
}

function hasOwnKey(
  value: Record<string, JsonValue>,
  key: string
): key is keyof typeof value {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function isJsonObject(
  value: JsonValue | ComparableValue
): value is Record<string, JsonValue> {
  return value !== null && value !== MISSING && typeof value === "object" && !Array.isArray(value);
}

function escapePathSegment(key: string): string {
  return key.replace(/\./g, "\\.");
}
