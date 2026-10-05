import { describe, expect, it } from "vitest";
import { mergeSources, parseTsv } from "../scripts/build-data";

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

  it("rejects rows without a tone", () => {
    expect(() => parseTsv("你\tȵi\t\n")).toThrow(/tone/);
  });
});

describe("mergeSources", () => {
  it("follows the Daxue > Wencheng > Wenzhou priority", () => {
    const merged = mergeSources({
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
