import { describe, expect, it } from "vitest";
import { transcribe } from "@/lib/pipeline";
import { pickVariants } from "@/lib/opencc";
import { createSegmenter, italianLine } from "@/lib/segment";
import { lookup } from "@/lib/lookup";

describe("transcribe — the §1 table end to end", () => {
  it.each([
    ["你飯吃過冇", "gni va ci cu nau"],
    ["謝謝", "zi zi"],
    ["我去米蘭", "ng ciü meng la"],
    ["你做甚物", "gni ciu zang ma"],
    ["我冇錢", "ng nau gie"],
  ])("%s → %s", async (zh, ita) => {
    const r = await transcribe(zh);
    expect(r.ita).toBe(ita);
    expect(r.missing).toEqual([]);
  });

  it("gives IPA, tone and source per syllable", async () => {
    const r = await transcribe("我冇錢");
    expect(r.tokens.map((t) => [t.text, t.ipa, t.tone, t.source])).toEqual([
      ["我", "ɦŋ̍4", 4, "daxue"],
      ["冇", "nau4", 4, "wencheng"],
      ["錢", "dʑie2", 2, "daxue"],
    ]);
  });

  it("accepts simplified characters", async () => {
    const r = await transcribe("你饭吃过冇");
    expect(r.zh).toBe("你飯吃過冇");
    expect(r.ita).toBe("gni va ci cu nau");
    expect((await transcribe("我去米兰")).zh).toBe("我去米蘭");
  });

  it("keeps punctuation attached and maps it to ASCII", async () => {
    expect((await transcribe("你飯吃過冇？")).ita).toBe("gni va ci cu nau?");
    expect((await transcribe("謝謝，我冇錢。")).ita).toBe("zi zi, ng nau gie.");
  });

  it("marks characters missing from every table", async () => {
    const r = await transcribe("你𠀀");
    expect(r.missing).toEqual(["𠀀"]);
    expect(r.ita).toBe("gni ?");
  });

  it("uses the phrase override from overrides.json", async () => {
    const r = await transcribe("你飯吃過冇");
    expect(r.tokens.every((t) => t.source === "phrase")).toBe(true);
  });
});

describe("pickVariants", () => {
  const known = new Set(["吃", "爲", "台"]);
  const isKnown = (c: string) => known.has(c);

  it("picks the variant the tables know, per character", () => {
    // original, OpenCC "t", OpenCC "tw"
    expect(pickVariants("吃", "喫", "吃", isKnown)).toBe("吃");
    expect(pickVariants("为", "爲", "為", isKnown)).toBe("爲");
    expect(pickVariants("台", "臺", "臺", isKnown)).toBe("台");
  });

  it("falls back to the standard conversion", () => {
    expect(pickVariants("这", "這", "這", isKnown)).toBe("這");
    expect(pickVariants("ab", "abc", "ab", isKnown)).toBe("abc");
  });
});

describe("segmenter", () => {
  it("prefers the longest phrase override, left to right", () => {
    const segment = createSegmenter(lookup, {
      謝謝: { ita: "sci sci" },
      謝: { ita: "x" },
    });
    expect(italianLine(segment("謝謝謝"))).toBe("sci sci x");
  });

  it("rejects a phrase override whose syllables do not match its characters", () => {
    expect(() => createSegmenter(lookup, { 謝謝: { ita: "zi" } })).toThrow(/2 characters but 1 syllables/);
  });

  it("keeps Latin text and spaces as they are", () => {
    const segment = createSegmenter(lookup, {});
    expect(italianLine(segment("我去Milano"))).toBe("ng ciü Milano");
  });
});
