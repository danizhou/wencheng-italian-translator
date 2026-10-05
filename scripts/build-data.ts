/**
 * Builds src/data/wencheng.json from the MCPDict tables (Daxue > Wencheng > Wenzhou).
 * Run by hand: npm run build:data
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { CharEntry, Reading, Source, SourceReadings, WenchengData } from "../src/lib/data-types";

const REPO = "https://github.com/osfans/MCPDict";
const DIR = "tools/tables/output";
const FILES: Record<Source, string> = {
  daxue: "文成大嶨.tsv",
  wencheng: "文成.tsv",
  wenzhou: "溫州.tsv",
};
const PRIORITY: Source[] = ["daxue", "wencheng", "wenzhou"];
const OUT = fileURLToPath(new URL("../src/data/wencheng.json", import.meta.url));
const NO_CHAR = "□";

/** Parses one MCPDict TSV into char → readings (file order kept, duplicates dropped). */
export function parseTsv(text: string): Map<string, Reading[]> {
  const out = new Map<string, Reading[]>();
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const [char, ipa, gloss] = line.split("\t");
    if (!char || char === NO_CHAR || !ipa) continue;
    const m = /^(.+?)([0-8])$/.exec(ipa.trim());
    if (!m) throw new Error(`IPA senza tono: ${JSON.stringify(line)}`);
    const readings = out.get(char) ?? [];
    if (readings.some((r) => r.ipa === m[0])) continue;
    const reading: Reading = { ipa: m[0], tone: Number(m[2]) };
    if (gloss?.trim()) reading.gloss = gloss.trim();
    readings.push(reading);
    out.set(char, readings);
  }
  return out;
}

/** Merges sources: the highest-priority source owns `readings`, the rest go to `alt`. */
export function mergeSources(tables: Partial<Record<Source, Map<string, Reading[]>>>): Record<string, CharEntry> {
  const chars: Record<string, CharEntry> = {};
  for (const source of PRIORITY) {
    for (const [char, readings] of tables[source] ?? []) {
      const entry = chars[char];
      if (!entry) chars[char] = { source, readings };
      else (entry.alt ??= []).push({ source, readings } satisfies SourceReadings);
    }
  }
  return chars;
}

function fetchTables(): { tables: Record<Source, Map<string, Reading[]>>; commit: string } {
  const dir = mkdtempSync(join(tmpdir(), "mcpdict-"));
  const git = (...args: string[]) =>
    execFileSync("git", ["-c", "core.quotepath=off", ...args], { cwd: dir, encoding: "utf8" });
  try {
    git("clone", "--depth", "1", "--filter=blob:none", "--no-checkout", REPO, ".");
    git("checkout", "HEAD", "--", ...Object.values(FILES).map((f) => `${DIR}/${f}`));
    const commit = git("rev-parse", "HEAD").trim();
    const tables = Object.fromEntries(
      PRIORITY.map((s) => [s, parseTsv(readFileSync(join(dir, DIR, FILES[s]), "utf8"))]),
    ) as Record<Source, Map<string, Reading[]>>;
    return { tables, commit };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function main() {
  const { tables, commit } = fetchTables();
  const chars = mergeSources(tables);
  const data: WenchengData = {
    meta: { generated: new Date().toISOString().slice(0, 10), repo: REPO, commit, files: FILES },
    chars,
  };
  const json = JSON.stringify(data);
  writeFileSync(OUT, json + "\n");

  const entries = Object.values(chars);
  const syllables = (rs: Reading[]) => rs.map((r) => r.ipa.slice(0, -1));
  console.log(`Scritto ${OUT} (${(Buffer.byteLength(json) / 1024).toFixed(0)} KB), commit MCPDict ${commit.slice(0, 7)}`);
  for (const s of PRIORITY) {
    const table = tables[s];
    const distinct = new Set([...table.values()].flatMap(syllables));
    const primary = entries.filter((e) => e.source === s).length;
    console.log(`  ${s.padEnd(9)} ${FILES[s].padEnd(9)} caratteri: ${String(table.size).padStart(5)}  primari: ${String(primary).padStart(5)}  sillabe distinte (senza tono): ${distinct.size}`);
  }
  console.log(`  totale caratteri: ${entries.length}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
