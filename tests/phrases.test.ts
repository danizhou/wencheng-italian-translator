import { describe, expect, it } from "vitest";
import { isVerified, PHRASE_CATEGORIES, PHRASES, transcribePhrase } from "@/lib/phrases";
import { loadLookup } from "@/lib/lookup";

const lookup = await loadLookup("wencheng");
const qingtian = await loadLookup("qingtian");
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

  it.each([
    ["Wencheng", lookup],
    ["Qingtian", qingtian],
  ])("only uses characters that are in the %s tables", (_, l) => {
    const missing = PHRASES.flatMap((p) => [...p.zh].filter((c) => !l(c)).map((c) => `${p.id}: ${c}`));
    expect(missing).toEqual([]);
  });

  it("stores traditional characters (the UI shows them simplified)", () => {
    expect(PHRASES.find((p) => p.id === "hai-mangiato")?.zh).toBe("你飯吃過冇");
    expect(toSimplified("你飯吃過冇")).toBe("你饭吃过冇");
  });

  it("every picked reading exists among the character's readings and is applied", async () => {
    for (const p of PHRASES) {
      for (const [char, ipa] of Object.entries(p.pick ?? {})) {
        expect(p.zh, p.id).toContain(char);
        const r = lookup(char)!;
        expect([r.reading.ipa, ...r.alts.map((a) => a.ipa)], `${p.id}: ${char}`).toContain(ipa);
        expect((await transcribePhrase(p, "wencheng")).tokens.find((t) => t.text === char)?.ipa, `${p.id}: ${char}`).toBe(ipa);
      }
    }
  });

  it.each([
    ["hai-mangiato", "gni va ci cu nau"],
    ["grazie", "zi zi"],
    ["vado-a-milano", "ng ciü meng la"],
    ["che-fai", "gni ciu zang ma"],
    ["non-ho-soldi", "ng nau gie"],
  ])("verified phrase %s → %s", async (id, ita) => {
    const p = PHRASES.find((x) => x.id === id)!;
    expect(isVerified(p, "wencheng")).toBe(true);
    expect((await transcribePhrase(p, "wencheng")).ita).toBe(ita);
  });

  it("uses the readings picked for 今日 and 要緊", async () => {
    expect((await transcribePhrase(PHRASES.find((p) => p.id === "fa-freddo")!, "wencheng")).tokens.slice(0, 2).map((t) => t.ipa)).toEqual(["ke1", "ne8"]);
    expect((await transcribePhrase(PHRASES.find((p) => p.id === "non-fa-niente")!, "wencheng")).tokens.map((t) => t.ipa)).toEqual(["fɛ3", "ʔyø5", "tɕiaŋ3"]);
  });

  it("reads the phrases in Qingtian without the Wencheng picks and marks them all to verify", async () => {
    const p = PHRASES.find((x) => x.id === "hai-mangiato")!;
    expect((await transcribePhrase(p, "qingtian")).ita).toBe("gni va ciai cheu nau");
    const picked = PHRASES.find((x) => x.id === "fa-freddo")!;
    const tokens = (await transcribePhrase(picked, "qingtian")).tokens;
    expect(tokens.every((t) => t.source !== "override")).toBe(true);
    expect(PHRASES.some((x) => isVerified(x, "qingtian"))).toBe(false);
  });

  it("has no affectionate or greeting-card phrases", () => {
    const categories = PHRASE_CATEGORIES.map((c) => c.id);
    expect(categories).not.toContain("affetto");
    expect(PHRASES.map((p) => p.it)).not.toContain("Ti voglio bene");
  });
});
