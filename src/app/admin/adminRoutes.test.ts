import { describe, expect, it } from "vitest";
import { metadata } from "@/app/admin/layout";

describe("admin routes", () => {
  it("are noindex and nofollow", () => {
    expect(metadata.robots).toMatchObject({ index: false, follow: false, nocache: true });
  });
});
