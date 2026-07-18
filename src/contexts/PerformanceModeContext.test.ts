import { describe, expect, it } from "vitest";
import { detectAutomaticPerformanceMode } from "@/contexts/PerformanceModeContext";

describe("automatic performance mode", () => {
  it("uses low-resource mode for reduced motion or constrained devices", () => {
    expect(detectAutomaticPerformanceMode({ hardwareConcurrency: 8 } as unknown as Navigator, true)).toBe("low");
    expect(detectAutomaticPerformanceMode({ hardwareConcurrency: 2 } as unknown as Navigator, false)).toBe("low");
  });

  it("keeps the full experience on a capable connection", () => {
    expect(detectAutomaticPerformanceMode({ hardwareConcurrency: 8, deviceMemory: 8, connection: { effectiveType: "4g" } } as unknown as Navigator, false)).toBe("full");
  });
});
