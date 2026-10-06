/**
 * Builds src/data/simplified.json: traditional → simplified for every CJK
 * character OpenCC changes, so the UI can show simplified Chinese without
 * loading opencc in the browser. Run by hand: npm run build:simplified
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as OpenCC from "opencc-js/t2cn";

const OUT = fileURLToPath(new URL("../src/data/simplified.json", import.meta.url));
const RANGES: [number, number][] = [
  [0x3400, 0x4dbf], // CJK Extension A
  [0x4e00, 0x9fff], // CJK Unified Ideographs
  [0xf900, 0xfaff], // CJK Compatibility Ideographs
];

const toCn = OpenCC.Converter({ from: "t", to: "cn" });
const chars: string[] = [];
for (const [from, to] of RANGES) for (let cp = from; cp <= to; cp++) chars.push(String.fromCodePoint(cp));

// One character per line, so phrase rules never join neighbours
const converted = toCn(chars.join("\n")).split("\n");
if (converted.length !== chars.length) throw new Error("OpenCC changed the line count");

const map: Record<string, string> = {};
chars.forEach((c, i) => {
  if (converted[i] !== c && [...converted[i]].length === 1) map[c] = converted[i];
});
writeFileSync(OUT, JSON.stringify(map) + "\n");
console.log(`Wrote ${OUT}: ${Object.keys(map).length} characters`);
