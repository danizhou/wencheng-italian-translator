import { describe, expect, it } from "vitest";
import { createLookup, loadLookup, parseIpa } from "@/lib/lookup";
import type { DialectData } from "@/lib/data-types";

const lookup = await loadLookup("wencheng");
const qingtian = await loadLookup("qingtian");

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

  it("uses an estimated reading when only Wenzhou has the character", () => {
    expect(lookup("幾")?.reading).toMatchObject({ ipa: "tsɿ3", source: "estimated" });
  });

  it("falls back to Wenzhou when no estimate is possible", () => {
    expect(lookup("噸")?.reading.source).toBe("wenzhou");
  });

  it("returns null for unknown characters and for □", () => {
    expect(lookup("□")).toBeNull();
    expect(lookup("a")).toBeNull();
  });

  it("applies the overrides from overrides.json", () => {
    expect(lookup("謝")?.reading).toMatchObject({ ipa: "zi6", source: "override" });
  });
});

describe("lookup on the Qingtian data", () => {
  it.each([
    ["你", "ȵi4", "wenxi"],
    ["飯", "va6", "wenxi"],
    ["吃", "tɕʰiai7", "wenxi"],
    ["謝", "zei6", "wenxi"],
    ["錢", "dʑi2", "wenxi"],
  ])("%s → %s (%s)", (char, ipa, source) => {
    expect(qingtian(char)?.reading).toMatchObject({ ipa, source });
  });

  it("follows Wenxi > Beishan > Qingtian > Wenzhou", () => {
    const r = qingtian("吃")!;
    expect(r.alts[0]).toMatchObject({ ipa: "tsʰɿʔ7", source: "beishan" });
    expect(r.alts.at(-1)?.source).toBe("wenzhou");
    expect(qingtian("去")?.reading.source).toBe("wenxi");
  });

  it("puts the colloquial reading first and tags both registers", () => {
    const r = qingtian("我")!;
    expect(r.reading).toMatchObject({ ipa: "ʔŋ̍4", gloss: "白讀", source: "wenxi" });
    expect(r.alts[0]).toMatchObject({ ipa: "ŋɤu4", gloss: "文讀", source: "wenxi" });
  });

  it("falls back to Wenzhou for characters outside the Qingtian tables", () => {
    expect(qingtian("冇")?.reading.source).toBe("wenzhou");
  });

  it("does not use the Wencheng overrides", () => {
    expect(qingtian("謝")?.reading.source).not.toBe("override");
  });

  it("is loaded once per dialect", async () => {
    expect(await loadLookup("qingtian")).toBe(qingtian);
  });
});

describe("character overrides", () => {
  const data: DialectData = {
    meta: { generated: "", repo: "", commit: "", files: {} },
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

  it("accepts simplified keys for traditional characters", () => {
    const l = createLookup(data, { chars: { 我: { ipa: "ŋu4" }, 谢: { ipa: "zia6" } }, phrases: {} });
    expect(l("謝")?.reading).toMatchObject({ ipa: "zia6", source: "override" });
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
