import { describe, expect, it } from "vitest";
import { createLookup, lookup, parseIpa } from "@/lib/lookup";
import type { WenchengData } from "@/lib/data-types";

describe("lookup sui dati reali", () => {
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

  it("usa Daxue come fonte primaria e mette le altre fonti in alts", () => {
    const r = lookup("飯")!;
    expect(r.reading.source).toBe("daxue");
    expect(r.alts).toEqual([
      { ipa: "vɔ6", tone: 6, source: "wencheng" },
      { ipa: "va6", tone: 6, source: "wenzhou" },
    ]);
  });

  it("tiene le altre letture della fonte primaria come prime alternative", () => {
    const r = lookup("吃")!;
    expect(r.alts[0]).toMatchObject({ ipa: "tɕʰia7", source: "daxue" });
    expect(r.alts.map((a) => a.source)).toContain("wenzhou");
  });

  it("deduplica le letture uguali tra fonti", () => {
    const r = lookup("你")!;
    expect(r.alts).toEqual([]);
  });

  it("ricade su Wencheng quando Daxue manca", () => {
    expect(lookup("冇")?.reading).toMatchObject({ ipa: "nau4", source: "wencheng" });
  });

  it("ricade su Wenzhou quando mancano le tabelle di Wencheng", () => {
    expect(lookup("幾")?.reading.source).toBe("wenzhou");
  });

  it("restituisce null per caratteri sconosciuti e per □", () => {
    expect(lookup("□")).toBeNull();
    expect(lookup("a")).toBeNull();
  });

  it("applica gli override di overrides.json", () => {
    expect(lookup("謝")?.reading).toMatchObject({ ipa: "zi6", source: "override" });
  });
});

describe("override dei caratteri", () => {
  const data: WenchengData = {
    meta: { generated: "", repo: "", commit: "", files: { daxue: "", wencheng: "", wenzhou: "" } },
    chars: {
      我: { source: "daxue", readings: [{ ipa: "ɦŋ̍4", tone: 4 }, { ipa: "ŋu4", tone: 4 }] },
    },
  };

  it("vince su Daxue e lascia le letture delle tabelle come alternative", () => {
    const l = createLookup(data, { chars: { 我: { ipa: "ŋu4", note: "Yuhu" } }, phrases: {} });
    expect(l("我")).toEqual({
      char: "我",
      reading: { ipa: "ŋu4", tone: 4, gloss: "Yuhu", source: "override" },
      alts: [{ ipa: "ɦŋ̍4", tone: 4, source: "daxue" }],
    });
  });

  it("funziona anche per caratteri assenti dalle tabelle", () => {
    const l = createLookup(data, { chars: { 嘅: { ipa: "ɡe0" } }, phrases: {} });
    expect(l("嘅")).toEqual({ char: "嘅", reading: { ipa: "ɡe0", tone: 0, source: "override" }, alts: [] });
  });

  it("rifiuta un override senza tono", () => {
    expect(() => createLookup(data, { chars: { 我: { ipa: "ŋu" } }, phrases: {} })).toThrow(/tono/);
  });
});

describe("parseIpa", () => {
  it("estrae il tono, compreso il tono neutro 0", () => {
    expect(parseIpa("tɕʰi7")).toEqual({ ipa: "tɕʰi7", tone: 7 });
    expect(parseIpa("ta0")).toEqual({ ipa: "ta0", tone: 0 });
  });
});
