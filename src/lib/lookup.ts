import type { DialectData, Reading, Source } from "./data-types";
import type { DialectId } from "./dialects";
import overridesJson from "@/data/overrides.json";
import { toSimplified } from "./simplified";

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

export type Lookup = (char: string) => LookupResult | null;

/** "ȵi4" → { ipa: "ȵi4", tone: 4 } */
export function parseIpa(ipa: string): Reading {
  const m = /^.+?([0-8])$/.exec(ipa.trim());
  if (!m) throw new Error(`IPA without a trailing tone (0–8): ${JSON.stringify(ipa)}`);
  return { ipa: m[0], tone: Number(m[1]) };
}

export function createLookup(data: DialectData, overrides: Overrides): Lookup {
  // Keyed by simplified form, so overrides.json may use either script
  const charOverrides = new Map(
    Object.entries(overrides.chars).map(([char, o]) => [
      toSimplified(char),
      { ...parseIpa(o.ipa), ...(o.note ? { gloss: o.note } : {}), source: "override" as const },
    ]),
  );

  return function lookup(char: string): LookupResult | null {
    const entry = data.chars[char];
    const override = charOverrides.get(toSimplified(char));
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

export const overrides = overridesJson as Record<DialectId, Overrides>;

// Each table is ~800 KB, so it is loaded only when its dialect is first used.
const DATA: Record<DialectId, () => Promise<{ default: unknown }>> = {
  wencheng: () => import("@/data/wencheng.json"),
  qingtian: () => import("@/data/qingtian.json"),
};
const lookups = new Map<DialectId, Promise<Lookup>>();

export function loadLookup(dialect: DialectId): Promise<Lookup> {
  let lookup = lookups.get(dialect);
  if (!lookup) {
    lookup = DATA[dialect]().then((m) => createLookup(m.default as DialectData, overrides[dialect]));
    lookups.set(dialect, lookup);
  }
  return lookup;
}
