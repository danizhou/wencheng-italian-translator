import { describe, expect, it } from "vitest";
import { ipaToVietnamese, placeTone, vietnameseLine } from "@/lib/vi";
import { transcribe } from "@/lib/pipeline";
import wencheng from "@/data/wencheng.json";
import type { WenchengData } from "@/lib/data-types";

describe("ipaToVietnamese — the §1 syllables", () => {
  it.each([
    ["ȵi4", "nhĩ"],
    ["vɑ6", "và"],
    ["tɕʰi7", "chỉ"],
    ["ku5", "cụ"],
    ["nau4", "não"],
    ["zi6", "dì"],
    ["ɦŋ̍4", "ững"],
    ["tɕʰy5", "chuỵ"],
    ["meŋ4", "mễnh"],
    ["lɑ2", "là"],
    ["tɕyu5", "chịu"],
    ["zaŋ4", "dãng"],
    ["ma8", "mả"],
    ["dʑie2", "giề"],
    ["foŋ1", "phông"],
  ])("%s → %s", (ipa, vi) => {
    expect(ipaToVietnamese(ipa)).toBe(vi);
  });
});

describe("ipaToVietnamese — Vietnamese spelling", () => {
  it.each([
    ["kʰe5", "khệ", "aspirated k → kh"],
    ["ɡi2", "ghì", "g → gh before i"],
    ["ŋe2", "nghề", "ng → ngh before ê"],
    ["ke1", "kê", "c → k before ê"],
    ["kua1", "qua", "c + oa → qua"],
    ["ky3", "quý", "c + uy → quy"],
    ["dʑie2", "giề", "gi + iê → giê"],
    ["dʑi2", "gì", "gi + i → gi, tone on the i"],
    ["ɦi6", "ỳ", "lone i → y"],
    ["iaŋ2", "yềng", "lone iê → yê"],
    ["ʔȵi1", "nhi", "glottal stop dropped, tone 1 unmarked"],
    ["ta0", "ta", "neutral tone unmarked"],
  ])("%s → %s (%s)", (ipa, vi) => {
    expect(ipaToVietnamese(ipa)).toBe(vi);
  });

  it("maps the eight Wenzhou tones onto Vietnamese tones", () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8].map((t) => ipaToVietnamese(`ma${t}`))).toEqual(["ma", "mà", "má", "mã", "mạ", "mà", "mả", "mả"]);
  });
});

describe("placeTone", () => {
  it.each([
    ["ai", "sac", "ái"],
    ["ao", "hoi", "ảo"],
    ["oa", "huyen", "oà"],
    ["uy", "nang", "uỵ"],
    ["ương", "nga", "ưỡng"],
    ["iêu", "sac", "iếu"],
    ["oai", "hoi", "oải"],
    ["quy", "sac", "quý"],
    ["ang", "", "ang"],
  ] as const)("%s + %s → %s", (syllable, tone, expected) => {
    expect(placeTone(syllable, tone)).toBe(expected);
  });
});

describe("vietnameseLine", () => {
  it("reads the §1 sentences", async () => {
    expect(vietnameseLine((await transcribe("你飯吃過冇")).tokens)).toBe("nhĩ và chỉ cụ não");
    expect(vietnameseLine((await transcribe("我去米蘭？")).tokens)).toBe("ững chuỵ mễnh là?");
  });
});

describe("data coverage", () => {
  it("every reading in wencheng.json becomes Vietnamese letters only", () => {
    const letters = /^[a-zàáảãạăằắẳẵặâầấẩẫậđèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵ]+$/;
    const bad = new Set<string>();
    for (const entry of Object.values((wencheng as WenchengData).chars)) {
      for (const group of [entry, ...(entry.alt ?? [])]) {
        for (const { ipa } of group.readings) {
          const vi = ipaToVietnamese(ipa).normalize("NFC");
          if (!letters.test(vi)) bad.add(`${ipa} → ${vi}`);
        }
      }
    }
    expect([...bad]).toEqual([]);
  });
});
