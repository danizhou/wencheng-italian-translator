import type { Reading, Source, WenchengData } from "./data-types";
import wenchengJson from "@/data/wencheng.json";
import overridesJson from "@/data/overrides.json";

export type LookupSource = Source | "override";

export type SourcedReading = Reading & { source: LookupSource };

export interface Overrides {
  chars: Record<string, { ipa: string; note?: string }>;
  phrases: Record<string, { ita: string; note?: string }>;
}

export interface LookupResult {
  char: string;
  /** Reading used by default: override, else the first reading of the highest-priority source */
  reading: SourcedReading;
  /** Every other known reading, highest priority first, one per distinct IPA */
  alts: SourcedReading[];
}

/** "ȵi4" → { ipa: "ȵi4", tone: 4 } */
export function parseIpa(ipa: string): Reading {
  const m = /^.+?([0-8])$/.exec(ipa.trim());
  if (!m) throw new Error(`IPA senza tono finale (0–8): ${JSON.stringify(ipa)}`);
  return { ipa: m[0], tone: Number(m[1]) };
}

export function createLookup(data: WenchengData, overrides: Overrides) {
  const charOverrides = new Map(
    Object.entries(overrides.chars).map(([char, o]) => [
      char,
      { ...parseIpa(o.ipa), ...(o.note ? { gloss: o.note } : {}), source: "override" as const },
    ]),
  );

  return function lookup(char: string): LookupResult | null {
    const entry = data.chars[char];
    const override = charOverrides.get(char);
    if (!entry && !override) return null;

    const all: SourcedReading[] = [];
    if (override) all.push(override);
    for (const group of entry ? [entry, ...(entry.alt ?? [])] : []) {
      for (const r of group.readings) all.push({ ...r, source: group.source });
    }

    const seen = new Set<string>();
    const unique = all.filter((r) => !seen.has(r.ipa) && seen.add(r.ipa));
    const [reading, ...alts] = unique;
    return { char, reading, alts };
  };
}

export const overrides = overridesJson as Overrides;
export const lookup = createLookup(wenchengJson as WenchengData, overrides);
