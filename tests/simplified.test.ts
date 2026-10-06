import { describe, expect, it } from "vitest";
import { toSimplified } from "@/lib/simplified";

describe("toSimplified", () => {
  it("converts the §1 sentences", () => {
    expect(toSimplified("你飯吃過冇")).toBe("你饭吃过冇");
    expect(toSimplified("謝謝")).toBe("谢谢");
    expect(toSimplified("我去米蘭")).toBe("我去米兰");
    expect(toSimplified("我冇錢")).toBe("我冇钱");
  });

  it("converts variants used by the tables and the UI", () => {
    expect(toSimplified("文成大嶨 溫州 文成話 爲 為 裏 裡")).toBe("文成大峃 温州 文成话 为 为 里 里");
  });

  it("leaves simplified text, Latin and punctuation unchanged", () => {
    expect(toSimplified("你做甚物？ Milano, ng!")).toBe("你做甚物？ Milano, ng!");
  });
});
