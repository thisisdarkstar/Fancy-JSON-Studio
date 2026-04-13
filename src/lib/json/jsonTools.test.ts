import { describe, expect, it } from "vitest";
import {
  buildDiffTree,
  buildPaneState,
  buildTree,
  computeStructuralDelta,
  filterTree,
  formatJsonText,
  minifyJsonText,
  normalizeJsonValue,
  summarizeDiffTree
} from "./jsonTools";

describe("jsonTools", () => {
  it("parses valid JSON into pane state", () => {
    const pane = buildPaneState('{"name":"Ava","items":[1,2,3]}', "paste");

    expect(pane.isValid).toBe(true);
    expect(pane.error).toBeNull();
    expect(pane.parsedValue).toEqual({
      name: "Ava",
      items: [1, 2, 3]
    });
  });

  it("captures readable location details for invalid JSON", () => {
    const pane = buildPaneState('{\n  "name": "Ava",\n}', "paste");

    expect(pane.isValid).toBe(false);
    expect(pane.error?.message).toBeTruthy();
    expect(pane.error?.line).toBeTypeOf("number");
    expect(pane.error?.column).toBeTypeOf("number");
  });

  it("formats and minifies JSON text", () => {
    const compact = minifyJsonText('{\n  "name": "Ava",\n  "active": true\n}');
    const pretty = formatJsonText('{"name":"Ava","active":true}');

    expect(compact).toBe('{"name":"Ava","active":true}');
    expect(pretty).toBe('{\n  "name": "Ava",\n  "active": true\n}');
  });

  it("normalizes object keys recursively", () => {
    const normalized = normalizeJsonValue({
      zeta: 1,
      alpha: {
        zulu: 2,
        beta: 3
      }
    });

    expect(normalized).toEqual({
      alpha: {
        beta: 3,
        zulu: 2
      },
      zeta: 1
    });
  });

  it("builds structural diff trees and summaries", () => {
    const diffTree = buildDiffTree(
      {
        name: "Ava",
        nested: {
          age: 12
        }
      },
      {
        name: "Ava",
        nested: {
          age: 13
        },
        enabled: true
      }
    );

    const summary = summarizeDiffTree(diffTree);

    expect(summary).toEqual({
      added: 1,
      removed: 0,
      changed: 1,
      unchanged: 1
    });
    expect(computeStructuralDelta(
      {
        name: "Ava",
        nested: {
          age: 12
        }
      },
      {
        name: "Ava",
        nested: {
          age: 13
        },
        enabled: true
      }
    )).toBeTruthy();
  });

  it("filters tree nodes by matching descendants", () => {
    const tree = buildTree({
      profile: {
        city: "Pune",
        zip: 411001
      }
    });

    const filtered = filterTree(tree, "zip");

    expect(filtered).not.toBeNull();
    expect(filtered?.children?.[0].children?.[0].key).toBe("zip");
  });
});
