import { describe, expect, it } from "vitest";
import { MESSAGES } from "@/i18n/messages";

function flatten(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object") return [prefix];
  return Object.entries(value).flatMap(([key, child]) => flatten(child, prefix ? `${prefix}.${key}` : key));
}

function stringValues(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (!value || typeof value !== "object") return [];
  return Object.values(value).flatMap(stringValues);
}

describe("translation dictionaries", () => {
  it("have exact key parity", () => {
    const english = flatten(MESSAGES.en).sort();
    expect(flatten(MESSAGES.hi).sort()).toEqual(english);
    expect(flatten(MESSAGES.mr).sort()).toEqual(english);
  });

  it("does not expose the legacy brand in translated UI copy", () => {
    expect(stringValues(MESSAGES).join("\n")).not.toMatch(/TenderMate/i);
  });
});
