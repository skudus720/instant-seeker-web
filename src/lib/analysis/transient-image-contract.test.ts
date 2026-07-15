import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const analyzeRoute = readFileSync(
  join(root, "src/app/api/analyze/route.ts"),
  "utf8",
);
const remoteProvider = readFileSync(
  join(root, "src/lib/analysis/remote-http-provider.ts"),
  "utf8",
);

describe("transient screenshot processing contract", () => {
  it("never writes new analysis screenshots to object storage", () => {
    expect(analyzeRoute).not.toContain("analysis-screenshots");
    expect(analyzeRoute).not.toMatch(/\.upload\s*\(/);
    expect(analyzeRoute).toContain("private_image_path: null");
  });

  it("clears the request image buffer after every processing path", () => {
    expect(analyzeRoute).toMatch(/finally\s*{[\s\S]*originalBuffer\.fill\(0\)/);
  });

  it("authorizes included roles without bypassing account status", () => {
    expect(analyzeRoute).toContain("hasRoleBasedAnalysisAccess");
    expect(analyzeRoute).toContain("isAccountOperational");
  });

  it("marks remote-provider image requests as no-retention", () => {
    expect(remoteProvider).toContain('imageRetention: "none"');
    expect(remoteProvider).not.toContain("secureImageReference");
  });
});
