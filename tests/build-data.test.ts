import { describe, expect, it } from "vitest";
import { estimateFromFallback, mergeSources, parseTsv } from "../scripts/build-data";

describe("parseTsv", () => {
  const tsv = "#漢字\t音標\t解釋\n□\ttɕie5\t(用脚)抵住\n吃\ttɕʰi7\t\n吃\ttɕʰia7\t旧文读\n吃\ttɕʰi7\t\n";

  it("skips the header and □, keeps multiple readings and drops duplicates", () => {
    const t = parseTsv(tsv);
    expect([...t.keys()]).toEqual(["吃"]);
    expect(t.get("吃")).toEqual([
      { ipa: "tɕʰi7", tone: 7 },
      { ipa: "tɕʰia7", tone: 7, gloss: "旧文读" },
    ]);
  });

  it("strips the colloquial (-) and literary (=) marks, colloquial first", () => {
    const t = parseTsv("我\tŋɤu4=\t\n我\tʔŋ̍4-\t\n去\tkʰe5-\t走~\n");
    expect(t.get("我")).toEqual([
      { ipa: "ʔŋ̍4", tone: 4, gloss: "白讀" },
      { ipa: "ŋɤu4", tone: 4, gloss: "文讀" },
    ]);
    expect(t.get("去")).toEqual([{ ipa: "kʰe5", tone: 5, gloss: "白讀 走~" }]);
  });

  it("rejects rows without a tone", () => {
    expect(() => parseTsv("你\tȵi\t\n")).toThrow(/tone/);
  });
});

describe("mergeSources", () => {
  it("follows the Wenxi > Beishan > Qingtian > Wenzhou priority", () => {
    const merged = mergeSources(["wenxi", "beishan", "qingtian", "wenzhou"], {
      wenzhou: parseTsv("吃\ttsʰɿ7\t\n"),
      qingtian: parseTsv("吃\ttsʰɿʔ7\t\n去\tkʰi5\t\n"),
      beishan: parseTsv("吃\ttsʰɿʔ7\t\n"),
      wenxi: parseTsv("吃\ttɕʰiai7\t\n"),
    });
    expect(merged["吃"].source).toBe("wenxi");
    expect(merged["吃"].alt?.map((a) => a.source)).toEqual(["beishan", "qingtian", "wenzhou"]);
    expect(merged["去"].source).toBe("qingtian");
  });

  it("follows the Daxue > Wencheng > Wenzhou priority", () => {
    const merged = mergeSources(["daxue", "wencheng", "wenzhou"], {
      wenzhou: parseTsv("冇\tʔnau3\t\n飯\tva6\t\n"),
      wencheng: parseTsv("冇\tnau4\t\n飯\tvɔ6\t\n"),
      daxue: parseTsv("飯\tvɑ6\t\n"),
    });
    expect(merged["飯"].source).toBe("daxue");
    expect(merged["飯"].alt?.map((a) => a.source)).toEqual(["wencheng", "wenzhou"]);
    expect(merged["冇"]).toEqual({
      source: "wencheng",
      readings: [{ ipa: "nau4", tone: 4 }],
      alt: [{ source: "wenzhou", readings: [{ ipa: "ʔnau3", tone: 3 }] }],
    });
  });
});

describe("estimateFromFallback", () => {
  const priority = ["wenxi", "wenzhou"] as const;
  const merged = () =>
    mergeSources([...priority], {
      // Wenzhou "ka1" pairs with Wenxi "ko1" twice and "ke1" once
      wenxi: parseTsv("甲\tko1\t\n乙\tko1\t\n丙\tke1\t\n"),
      wenzhou: parseTsv("甲\tka1\t\n乙\tka1\t\n丙\tka1\t\n丁\tka1\t釘\n戊\tmu6\t\n"),
    });

  it("guesses the reading most often paired with the same Wenzhou reading", () => {
    expect(estimateFromFallback(merged(), "wenzhou")["丁"]).toEqual({
      source: "estimated",
      readings: [{ ipa: "ko1", tone: 1 }],
      alt: [{ source: "wenzhou", readings: [{ ipa: "ka1", tone: 1, gloss: "釘" }] }],
    });
  });

  it("keeps the Wenzhou reading when that reading was never paired", () => {
    expect(estimateFromFallback(merged(), "wenzhou")["戊"].source).toBe("wenzhou");
  });

  it("leaves the dialect's own readings alone", () => {
    expect(estimateFromFallback(merged(), "wenzhou")["丙"].readings).toEqual([{ ipa: "ke1", tone: 1 }]);
  });
});
