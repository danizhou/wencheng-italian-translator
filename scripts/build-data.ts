/**
 * Builds one JSON per dialect from the MCPDict tables:
 *   src/data/wencheng.json  Daxue > Wencheng > Wenzhou
 *   src/data/qingtian.json  Wenxi > Beishan > Qingtian > Wenzhou
 * Characters found only in Wenzhou get an estimated dialect reading (see estimateFromFallback).
 * Run by hand: npm run build:data
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { CharEntry, DialectData, Reading, Source, SourceReadings } from "../src/lib/data-types";

const REPO = "https://github.com/osfans/MCPDict";
const DIR = "tools/tables/output";
const FILES: Record<Exclude<Source, "estimated">, string> = {
  daxue: "文成大嶨.tsv",
  wencheng: "文成.tsv",
  wenxi: "青田溫溪.tsv",
  beishan: "青田北山.tsv",
  qingtian: "青田.tsv",
  wenzhou: "溫州.tsv",
};
/** Output file → sources, highest priority first */
const DIALECTS: Record<string, (keyof typeof FILES)[]> = {
  wencheng: ["daxue", "wencheng", "wenzhou"],
  qingtian: ["wenxi", "beishan", "qingtian", "wenzhou"],
};
const NO_CHAR = "□";
/** MCPDict marks colloquial (白讀) readings with "-" and literary (文讀) ones with "=" after the tone */
const REGISTER: Record<string, { tag: string; rank: number }> = {
  "-": { tag: "白讀", rank: 0 },
  "": { tag: "", rank: 1 },
  "=": { tag: "文讀", rank: 2 },
};

/** Parses one MCPDict TSV into char → readings (colloquial first, file order kept, duplicates dropped). */
export function parseTsv(text: string): Map<string, Reading[]> {
  const ranked = new Map<string, { reading: Reading; rank: number }[]>();
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const [char, ipa, gloss] = line.split("\t");
    if (!char || char === NO_CHAR || !ipa) continue;
    const m = /^(.+?([0-8]))([-=]?)$/.exec(ipa.trim());
    if (!m) throw new Error(`IPA without tone: ${JSON.stringify(line)}`);
    const readings = ranked.get(char) ?? [];
    if (readings.some((r) => r.reading.ipa === m[1])) continue;
    const register = REGISTER[m[3]];
    const reading: Reading = { ipa: m[1], tone: Number(m[2]) };
    const note = [register.tag, gloss?.trim()].filter(Boolean).join(" ");
    if (note) reading.gloss = note;
    readings.push({ reading, rank: register.rank });
    ranked.set(char, readings);
  }
  return new Map([...ranked].map(([char, rs]) => [char, rs.sort((a, b) => a.rank - b.rank).map((r) => r.reading)]));
}

/** Merges sources: the highest-priority source owns `readings`, the rest go to `alt`. */
export function mergeSources(priority: Source[], tables: Partial<Record<Source, Map<string, Reading[]>>>): Record<string, CharEntry> {
  const chars: Record<string, CharEntry> = {};
  for (const source of priority) {
    for (const [char, readings] of tables[source] ?? []) {
      const entry = chars[char];
      if (!entry) chars[char] = { source, readings };
      else (entry.alt ??= []).push({ source, readings } satisfies SourceReadings);
    }
  }
  return chars;
}

/**
 * For characters found only in the fallback table, guesses the dialect reading
 * from the regular sound correspondences: among the characters both tables
 * share, the dialect reading most often paired with the same fallback reading.
 * Measured with leave-one-out on the shared characters, this gives the right
 * Italian letters ~77% of the time for Qingtian and ~70% for Wencheng, against
 * ~61% and ~40% for the raw Wenzhou reading. The fallback readings stay in `alt`.
 */
export function estimateFromFallback(chars: Record<string, CharEntry>, fallback: Source): Record<string, CharEntry> {
  const pairs = new Map<string, Map<string, number>>();
  for (const entry of Object.values(chars)) {
    const from = entry.alt?.find((a) => a.source === fallback)?.readings[0].ipa;
    if (entry.source === fallback || !from) continue;
    const counts = pairs.get(from) ?? new Map<string, number>();
    counts.set(entry.readings[0].ipa, (counts.get(entry.readings[0].ipa) ?? 0) + 1);
    pairs.set(from, counts);
  }

  const out: Record<string, CharEntry> = {};
  for (const [char, entry] of Object.entries(chars)) {
    const counts = entry.source === fallback ? pairs.get(entry.readings[0].ipa) : undefined;
    if (!counts) {
      out[char] = entry;
      continue;
    }
    // Most frequent wins; ties go to the pair seen first
    const [ipa] = [...counts].sort((a, b) => b[1] - a[1])[0];
    out[char] = {
      source: "estimated",
      readings: [{ ipa, tone: Number(ipa.at(-1)) }],
      alt: [{ source: entry.source, readings: entry.readings }, ...(entry.alt ?? [])],
    };
  }
  return out;
}

function fetchTables(): { tables: Record<keyof typeof FILES, Map<string, Reading[]>>; commit: string } {
  const dir = mkdtempSync(join(tmpdir(), "mcpdict-"));
  const git = (...args: string[]) =>
    execFileSync("git", ["-c", "core.quotepath=off", ...args], { cwd: dir, encoding: "utf8" });
  try {
    git("clone", "--depth", "1", "--filter=blob:none", "--no-checkout", REPO, ".");
    git("checkout", "HEAD", "--", ...Object.values(FILES).map((f) => `${DIR}/${f}`));
    const commit = git("rev-parse", "HEAD").trim();
    const tables = Object.fromEntries(
      Object.entries(FILES).map(([s, file]) => [s, parseTsv(readFileSync(join(dir, DIR, file), "utf8"))]),
    ) as Record<keyof typeof FILES, Map<string, Reading[]>>;
    return { tables, commit };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function main() {
  const { tables, commit } = fetchTables();
  const syllables = (rs: Reading[]) => rs.map((r) => r.ipa.slice(0, -1));
  console.log(`MCPDict commit ${commit.slice(0, 7)}`);

  for (const [dialect, priority] of Object.entries(DIALECTS)) {
    const chars = estimateFromFallback(mergeSources(priority, tables), priority.at(-1)!);
    const files = Object.fromEntries(priority.map((s) => [s, FILES[s]]));
    const data: DialectData = {
      meta: { generated: new Date().toISOString().slice(0, 10), repo: REPO, commit, files },
      chars,
    };
    const out = fileURLToPath(new URL(`../src/data/${dialect}.json`, import.meta.url));
    const json = JSON.stringify(data);
    writeFileSync(out, json + "\n");

    const entries = Object.values(chars);
    console.log(`Wrote ${out} (${(Buffer.byteLength(json) / 1024).toFixed(0)} KB)`);
    for (const s of priority) {
      const table = tables[s];
      const distinct = new Set([...table.values()].flatMap(syllables));
      const primary = entries.filter((e) => e.source === s).length;
      console.log(`  ${s.padEnd(9)} ${FILES[s].padEnd(9)} chars: ${String(table.size).padStart(5)}  primary: ${String(primary).padStart(5)}  distinct syllables (toneless): ${distinct.size}`);
    }
    console.log(`  estimated from ${priority.at(-1)}: ${entries.filter((e) => e.source === "estimated").length}`);
    console.log(`  total chars: ${entries.length}`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
