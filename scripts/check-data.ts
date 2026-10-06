/** CI check: every generated dialect file in src/data is well-formed and big enough. */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { CharEntry, DialectData } from "../src/lib/data-types";

const FILES = ["wencheng.json", "qingtian.json"];
const MIN_CHARS = 3000;
const MAX_BYTES = 1024 * 1024;

let failed = false;
for (const file of FILES) {
  const raw = readFileSync(fileURLToPath(new URL(`../src/data/${file}`, import.meta.url)), "utf8");
  const data = JSON.parse(raw) as DialectData;
  const sources = new Set([...Object.keys(data.meta?.files ?? {}), "estimated"]);
  const errors: string[] = [];

  const checkGroup = (char: string, g: Pick<CharEntry, "source" | "readings">) => {
    if (!sources.has(g.source)) errors.push(`${char}: unknown source ${g.source}`);
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
    failed = true;
    console.error(`${file}:\n${errors.slice(0, 20).join("\n")}`);
  } else {
    console.log(`${file} OK: ${chars.length} chars, ${(Buffer.byteLength(raw) / 1024).toFixed(0)} KB`);
  }
}
if (failed) process.exit(1);
