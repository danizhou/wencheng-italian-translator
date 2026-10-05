/** CI check: src/data/wencheng.json is well-formed and big enough. */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { CharEntry, WenchengData } from "../src/lib/data-types";

const MIN_CHARS = 3000;
const MAX_BYTES = 1024 * 1024;
const SOURCES = new Set(["daxue", "wencheng", "wenzhou"]);
const path = fileURLToPath(new URL("../src/data/wencheng.json", import.meta.url));

const raw = readFileSync(path, "utf8");
const data = JSON.parse(raw) as WenchengData;
const errors: string[] = [];

const checkGroup = (char: string, g: Pick<CharEntry, "source" | "readings">) => {
  if (!SOURCES.has(g.source)) errors.push(`${char}: unknown source ${g.source}`);
  if (!Array.isArray(g.readings) || g.readings.length === 0) errors.push(`${char}: no readings`);
  for (const r of g.readings ?? []) {
    if (!/^.+[0-8]$/.test(r.ipa) || Number(r.ipa.at(-1)) !== r.tone) errors.push(`${char}: invalid reading ${JSON.stringify(r)}`);
  }
};

const chars = Object.entries(data.chars ?? {});
for (const [char, entry] of chars) {
  if ([...char].length !== 1 || char === "□") errors.push(`invalid key: ${char}`);
  checkGroup(char, entry);
  for (const a of entry.alt ?? []) checkGroup(char, a);
}
if (chars.length < MIN_CHARS) errors.push(`only ${chars.length} chars (minimum ${MIN_CHARS})`);
if (Buffer.byteLength(raw) > MAX_BYTES) errors.push(`file too large: ${Buffer.byteLength(raw)} bytes`);

if (errors.length) {
  console.error(errors.slice(0, 20).join("\n"));
  process.exit(1);
}
console.log(`wencheng.json OK: ${chars.length} chars, ${(Buffer.byteLength(raw) / 1024).toFixed(0)} KB`);
