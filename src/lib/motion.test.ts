import { describe, expect, it } from "vitest";
import { shouldAutoRotate } from "@/lib/motion";

describe("reduced motion behavior", () => {
  it("disables automatic movement for reduced motion and interaction", () => {
    expect(shouldAutoRotate(true, false, 3)).toBe(false);
    expect(shouldAutoRotate(false, true, 3)).toBe(false);
    expect(shouldAutoRotate(false, false, 1)).toBe(false);
    expect(shouldAutoRotate(false, false, 3)).toBe(true);
  });
});
