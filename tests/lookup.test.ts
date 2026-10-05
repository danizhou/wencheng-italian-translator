import { describe, expect, it } from "vitest";
import { createLookup, lookup, parseIpa } from "@/lib/lookup";
import type { WenchengData } from "@/lib/data-types";

describe("lookup on the real data", () => {
  // Readings from the §1 table of the plan (Daxue)
  it.each([
    ["你", "ȵi4", 4],
    ["飯", "vɑ6", 6],
    ["吃", "tɕʰi7", 7],
    ["風", "foŋ1", 1],
    ["錢", "dʑie2", 2],
    ["做", "tɕyu5", 5],
    ["謝", "zi6", 6],
  ])("%s → %s", (char, ipa, tone) => {
    const r = lookup(char);
    expect(r?.reading).toMatchObject({ ipa, tone });
  });

  it("uses Daxue as the primary source and puts the other sources in alts", () => {
    const r = lookup("飯")!;
    expect(r.reading.source).toBe("daxue");
    expect(r.alts).toEqual([
      { ipa: "vɔ6", tone: 6, source: "wencheng" },
      { ipa: "va6", tone: 6, source: "wenzhou" },
    ]);
  });

  it("lists the other primary-source readings first among the alternatives", () => {
    const r = lookup("吃")!;
    expect(r.alts[0]).toMatchObject({ ipa: "tɕʰia7", source: "daxue" });
    expect(r.alts.map((a) => a.source)).toContain("wenzhou");
  });

  it("deduplicates identical readings across sources", () => {
    const r = lookup("你")!;
    expect(r.alts).toEqual([]);
  });

  it("falls back to Wencheng when Daxue is missing", () => {
    expect(lookup("冇")?.reading).toMatchObject({ ipa: "nau4", source: "wencheng" });
  });

  it("falls back to Wenzhou when the Wencheng tables are missing", () => {
    expect(lookup("幾")?.reading.source).toBe("wenzhou");
  });

  it("returns null for unknown characters and for □", () => {
    expect(lookup("□")).toBeNull();
    expect(lookup("a")).toBeNull();
  });

  it("applies the overrides from overrides.json", () => {
    expect(lookup("謝")?.reading).toMatchObject({ ipa: "zi6", source: "override" });
  });
});

describe("character overrides", () => {
  const data: WenchengData = {
    meta: { generated: "", repo: "", commit: "", files: { daxue: "", wencheng: "", wenzhou: "" } },
    chars: {
      我: { source: "daxue", readings: [{ ipa: "ɦŋ̍4", tone: 4 }, { ipa: "ŋu4", tone: 4 }] },
    },
  };

  it("wins over Daxue and keeps the table readings as alternatives", () => {
    const l = createLookup(data, { chars: { 我: { ipa: "ŋu4", note: "Yuhu" } }, phrases: {} });
    expect(l("我")).toEqual({
      char: "我",
      reading: { ipa: "ŋu4", tone: 4, gloss: "Yuhu", source: "override" },
      alts: [{ ipa: "ɦŋ̍4", tone: 4, source: "daxue" }],
    });
  });

  it("also works for characters missing from the tables", () => {
    const l = createLookup(data, { chars: { 嘅: { ipa: "ɡe0" } }, phrases: {} });
    expect(l("嘅")).toEqual({ char: "嘅", reading: { ipa: "ɡe0", tone: 0, source: "override" }, alts: [] });
  });

  it("rejects an override without a tone", () => {
    expect(() => createLookup(data, { chars: { 我: { ipa: "ŋu" } }, phrases: {} })).toThrow(/tone/);
  });
});

describe("parseIpa", () => {
  it("extracts the tone, including neutral tone 0", () => {
    expect(parseIpa("tɕʰi7")).toEqual({ ipa: "tɕʰi7", tone: 7 });
    expect(parseIpa("ta0")).toEqual({ ipa: "ta0", tone: 0 });
  });
});
