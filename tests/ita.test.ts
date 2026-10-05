import { describe, expect, it } from "vitest";
import { createIpaToItalian, ipaToItalian, itaRules, splitTone } from "@/lib/ita";
import wencheng from "@/data/wencheng.json";
import type { WenchengData } from "@/lib/data-types";

describe("ipaToItalian — cases from plan §4.2", () => {
  it.each([
    ["ȵi4", "gni"],
    ["vɑ6", "va"],
    ["tɕʰi7", "ci"],
    ["ku5", "cu"],
    ["nau4", "nau"],
    ["zi6", "zi"],
    ["ɦŋ̍4", "ng"],
    ["tɕʰy5", "ciü"],
    ["meŋ4", "meng"],
    ["lɑ2", "la"],
    ["tɕyu5", "ciu"],
    ["zaŋ4", "zang"],
    ["ma8", "ma"],
    ["dʑie2", "gie"],
    ["foŋ1", "fong"],
    ["kʰe5", "che"],
    ["ɡi2", "ghi"],
  ])("%s → %s", (ipa, ita) => {
    expect(ipaToItalian(ipa)).toBe(ita);
  });
});

describe("ipaToItalian — spelling", () => {
  it.each([
    ["tɕa1", "cia", "soft c + a → cia"],
    ["tɕie1", "cie", "soft c before e: no extra i"],
    ["dʑa2", "gia", "soft g + a → gia"],
    ["ɕa1", "scia", "sc + a → scia"],
    ["ɕi1", "sci", "sc + i → sci"],
    ["ɕe1", "sce", "sc + e → sce"],
    ["ʑie6", "sgie", "ʑ → sg"],
    ["ka1", "ca", "hard c before a"],
    ["kɛ1", "chè", "hard c before è → ch"],
    ["ɡa2", "ga", "hard g before a"],
    ["ɡe2", "ghe", "hard g before e → gh"],
    ["ʔŋ̍3", "ng", "glottalized syllabic nasal"],
    ["ŋ̍6", "ng", "syllabic nasal"],
    ["ŋa4", "nga", "initial ŋ"],
    ["tsʰɿ7", "z", "ɿ is not written"],
    ["sɿ1", "s", "ɿ after s"],
    ["ɦi6", "i", "silent ɦ dropped"],
    ["ʔia7", "ia", "ʔ dropped"],
    ["ʔȵi1", "gni", "ʔ before a consonant"],
    ["ʔjiai7", "iai", "j + i does not double"],
    ["vɔ6", "vo", "ɔ → o"],
    ["ɡyø6", "güeu", "y → ü, ø → eu"],
    ["vəŋ2", "veng", "ə → e"],
    ["tsɤu5", "zeu", "ɤ → e"],
    ["pʰa7", "pa", "aspiration ignored"],
  ])("%s → %s (%s)", (ipa, ita) => {
    expect(ipaToItalian(ipa)).toBe(ita);
  });

  it("ignores neutral tone 0 and works without a tone", () => {
    expect(ipaToItalian("ta0")).toBe("ta");
    expect(ipaToItalian("ta")).toBe("ta");
  });

  it("writes ɦ as h when the config asks for it", () => {
    const withH = createIpaToItalian({
      ...itaRules,
      initials: itaRules.initials.map((r) => (r.ipa === "ɦ" ? { ...r, ita: "h" } : r)),
    });
    expect(withH("ɦu2")).toBe("hu");
    expect(withH("ɦŋ̍4")).toBe("ng");
  });
});

describe("splitTone", () => {
  it("splits syllable and tone", () => {
    expect(splitTone("tɕʰi7")).toEqual({ syllable: "tɕʰi", tone: 7 });
    expect(splitTone("ta")).toEqual({ syllable: "ta", tone: null });
  });
});

describe("data coverage", () => {
  it("every reading in wencheng.json becomes Italian letters only", () => {
    const bad: string[] = [];
    for (const entry of Object.values((wencheng as WenchengData).chars)) {
      for (const group of [entry, ...(entry.alt ?? [])]) {
        for (const { ipa } of group.readings) {
          const ita = ipaToItalian(ipa);
          if (!/^[a-zèü]+$/.test(ita)) bad.push(`${ipa} → ${JSON.stringify(ita)}`);
        }
      }
    }
    expect(bad).toEqual([]);
  });
});
