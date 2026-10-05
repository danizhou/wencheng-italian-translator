import { describe, expect, it } from "vitest";
import { createIpaToItalian, ipaToItalian, itaRules, splitTone } from "@/lib/ita";
import wencheng from "@/data/wencheng.json";
import type { WenchengData } from "@/lib/data-types";

describe("ipaToItalian — casi del piano §4.2", () => {
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

describe("ipaToItalian — ortografia", () => {
  it.each([
    ["tɕa1", "cia", "c dolce + a → cia"],
    ["tɕie1", "cie", "c dolce davanti a e: nessuna i"],
    ["dʑa2", "gia", "g dolce + a → gia"],
    ["ɕa1", "scia", "sc + a → scia"],
    ["ɕi1", "sci", "sci + i → sci"],
    ["ɕe1", "sce", "sc + e → sce"],
    ["ʑie6", "sgie", "ʑ → sg"],
    ["ka1", "ca", "c dura davanti ad a"],
    ["kɛ1", "chè", "c dura davanti a è → ch"],
    ["ɡa2", "ga", "g dura davanti ad a"],
    ["ɡe2", "ghe", "g dura davanti a e → gh"],
    ["ʔŋ̍3", "ng", "nasale sillabica glottalizzata"],
    ["ŋ̍6", "ng", "nasale sillabica"],
    ["ŋa4", "nga", "ŋ iniziale"],
    ["tsʰɿ7", "z", "ɿ non si scrive"],
    ["sɿ1", "s", "ɿ dopo s"],
    ["ɦi6", "i", "ɦ muta rimossa"],
    ["ʔia7", "ia", "ʔ rimosso"],
    ["ʔȵi1", "gni", "ʔ davanti a consonante"],
    ["ʔjiai7", "iai", "j + i non raddoppia"],
    ["vɔ6", "vo", "ɔ → o"],
    ["ɡyø6", "güeu", "y → ü, ø → eu"],
    ["vəŋ2", "veng", "ə → e"],
    ["tsɤu5", "zeu", "ɤ → e"],
    ["pʰa7", "pa", "aspirazione ignorata"],
  ])("%s → %s (%s)", (ipa, ita) => {
    expect(ipaToItalian(ipa)).toBe(ita);
  });

  it("ignora il tono neutro 0 e funziona anche senza tono", () => {
    expect(ipaToItalian("ta0")).toBe("ta");
    expect(ipaToItalian("ta")).toBe("ta");
  });

  it("scrive la h di ɦ se la config lo chiede", () => {
    const withH = createIpaToItalian({
      ...itaRules,
      initials: itaRules.initials.map((r) => (r.ipa === "ɦ" ? { ...r, ita: "h" } : r)),
    });
    expect(withH("ɦu2")).toBe("hu");
    expect(withH("ɦŋ̍4")).toBe("ng");
  });
});

describe("splitTone", () => {
  it("separa sillaba e tono", () => {
    expect(splitTone("tɕʰi7")).toEqual({ syllable: "tɕʰi", tone: 7 });
    expect(splitTone("ta")).toEqual({ syllable: "ta", tone: null });
  });
});

describe("copertura dei dati", () => {
  it("ogni lettura di wencheng.json diventa solo lettere italiane", () => {
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
