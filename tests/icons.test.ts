import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { icoFromPngs, logoSvg } from "../scripts/build-icons";
import logo from "@/data/logo.json";

describe("logo", () => {
  it("draws the bubble and the 温 glyph as paths, in the brand colors", () => {
    const svg = logoSvg();
    expect(svg).toContain(`fill="${logo.colors.bubble}"`);
    expect(svg).toContain(`fill="${logo.colors.glyph}"`);
    expect(svg).not.toContain("<text");
  });

  it("app icons get a full-bleed background", () => {
    expect(logoSvg({ background: "#13308f" })).toContain('<rect width="512" height="512" fill="#13308f"/>');
  });

  it("the committed icon.svg matches logo.json (run npm run build:icons after editing it)", () => {
    expect(readFileSync("src/app/icon.svg", "utf8")).toBe(logoSvg());
  });
});

describe("icoFromPngs", () => {
  it("writes an icon directory followed by the PNGs", () => {
    const a = Buffer.from("PNG-A");
    const b = Buffer.from("PNG-BB");
    const ico = icoFromPngs([{ size: 16, data: a }, { size: 32, data: b }]);
    expect(ico.readUInt16LE(2)).toBe(1); // type: icon
    expect(ico.readUInt16LE(4)).toBe(2); // two images
    expect(ico.readUInt8(6)).toBe(16);
    expect(ico.readUInt32LE(6 + 12)).toBe(6 + 32); // first image right after the directory
    expect(ico.readUInt32LE(22 + 12)).toBe(6 + 32 + a.length);
    expect(ico.subarray(38).toString()).toBe("PNG-APNG-BB");
  });

  it("the committed favicon.ico is a valid icon with three sizes", () => {
    const ico = readFileSync("src/app/favicon.ico");
    expect(ico.readUInt16LE(2)).toBe(1);
    expect(ico.readUInt16LE(4)).toBe(3);
  });
});
