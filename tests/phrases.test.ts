import { describe, expect, it } from "vitest";
import { PHRASE_CATEGORIES, PHRASES, transcribePhrase } from "@/lib/phrases";
import { lookup } from "@/lib/lookup";
import { toSimplified } from "@/lib/simplified";

describe("phrase library", () => {
  it("has about twenty phrases with unique ids and known categories", () => {
    expect(PHRASES.length).toBeGreaterThanOrEqual(20);
    expect(PHRASES.length).toBeLessThanOrEqual(30);
    expect(new Set(PHRASES.map((p) => p.id)).size).toBe(PHRASES.length);
    const categories = new Set(PHRASE_CATEGORIES.map((c) => c.id));
    for (const p of PHRASES) expect(categories.has(p.category), p.id).toBe(true);
    for (const c of categories) expect(PHRASES.some((p) => p.category === c), c).toBe(true);
  });

  it("only uses characters that are in the pronunciation tables", () => {
    const missing = PHRASES.flatMap((p) => [...p.zh].filter((c) => !lookup(c)).map((c) => `${p.id}: ${c}`));
    expect(missing).toEqual([]);
  });

  it("stores traditional characters (the UI shows them simplified)", () => {
    expect(PHRASES.find((p) => p.id === "hai-mangiato")?.zh).toBe("你飯吃過冇");
    expect(toSimplified("你飯吃過冇")).toBe("你饭吃过冇");
  });

  it("every picked reading exists among the character's readings and is applied", () => {
    for (const p of PHRASES) {
      for (const [char, ipa] of Object.entries(p.pick ?? {})) {
        expect(p.zh, p.id).toContain(char);
        const r = lookup(char)!;
        expect([r.reading.ipa, ...r.alts.map((a) => a.ipa)], `${p.id}: ${char}`).toContain(ipa);
        expect(transcribePhrase(p).tokens.find((t) => t.text === char)?.ipa, `${p.id}: ${char}`).toBe(ipa);
      }
    }
  });

  it.each([
    ["hai-mangiato", "gni va ci cu nau"],
    ["grazie", "zi zi"],
    ["vado-a-milano", "ng ciü meng la"],
    ["che-fai", "gni ciu zang ma"],
    ["non-ho-soldi", "ng nau gie"],
  ])("verified phrase %s → %s", (id, ita) => {
    const p = PHRASES.find((x) => x.id === id)!;
    expect(p.verified).toBe(true);
    expect(transcribePhrase(p).ita).toBe(ita);
  });

  it("uses the readings picked for 今日 and 要緊", () => {
    expect(transcribePhrase(PHRASES.find((p) => p.id === "fa-freddo")!).tokens.slice(0, 2).map((t) => t.ipa)).toEqual(["ke1", "ne8"]);
    expect(transcribePhrase(PHRASES.find((p) => p.id === "non-fa-niente")!).tokens.map((t) => t.ipa)).toEqual(["fɛ3", "ʔyø5", "tɕiaŋ3"]);
  });

  it("has no affectionate or greeting-card phrases", () => {
    const categories = PHRASE_CATEGORIES.map((c) => c.id);
    expect(categories).not.toContain("affetto");
    expect(PHRASES.map((p) => p.it)).not.toContain("Ti voglio bene");
  });
});
