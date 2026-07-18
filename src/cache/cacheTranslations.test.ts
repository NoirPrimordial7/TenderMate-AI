import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import hi from "../../messages/hi.json";
import mr from "../../messages/mr.json";

describe("cache status translations", () => {
  it("keeps English, Hindi, and Marathi cache-state keys in parity", () => {
    const expected = Object.keys(en.cache).sort();
    expect(Object.keys(hi.cache).sort()).toEqual(expected);
    expect(Object.keys(mr.cache).sort()).toEqual(expected);
    for (const messages of [en.cache, hi.cache, mr.cache]) {
      expect(messages.checking.trim()).not.toBe("");
      expect(messages.showingSaved.trim()).not.toBe("");
      expect(messages.refreshFailed.trim()).not.toBe("");
    }
  });
});
