import { describe, expect, it } from "vitest";
import nextConfig from "../next.config";

describe("project setup", () => {
  it("builds as a static export (no server for the LLM key to pass through)", () => {
    expect(nextConfig.output).toBe("export");
  });

  it("has no base path unless the Pages workflow sets one", () => {
    expect(nextConfig.basePath).toBe(process.env.PAGES_BASE_PATH ?? "");
  });
});
