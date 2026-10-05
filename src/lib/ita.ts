import rulesJson from "@/data/ita-rules.json";

interface InitialRule {
  ipa: string;
  ita: string;
  /** Soft c/g: insert "i" before a non-front vowel (tɕa → cia) */
  soft?: boolean;
  /** Spelling before a front vowel (k + i → chi) */
  beforeFront?: string;
}

export interface ItaRules {
  /** Removed before matching the initial (glottal stop) */
  ignoredPrefixes: { ipa: string }[];
  initials: InitialRule[];
  finals: { ipa: string; ita: string }[];
  frontVowels: string[];
  cleanup: { from: string; to: string }[];
}

const byLengthDesc = <T extends { ipa: string }>(rs: T[]) => [...rs].sort((a, b) => b.ipa.length - a.ipa.length);

/** Splits "tɕʰi7" into { syllable: "tɕʰi", tone: 7 }; tone is null when missing. */
export function splitTone(ipa: string): { syllable: string; tone: number | null } {
  const m = /^(.*?)([0-8])$/.exec(ipa.trim());
  return m ? { syllable: m[1], tone: Number(m[2]) } : { syllable: ipa.trim(), tone: null };
}

export function createIpaToItalian(rules: ItaRules) {
  const initials = byLengthDesc(rules.initials);
  const finals = byLengthDesc(rules.finals);
  const front = new Set(rules.frontVowels);

  const mapFinal = (s: string) => {
    let out = "";
    for (let i = 0; i < s.length; ) {
      const rule = finals.find((f) => s.startsWith(f.ipa, i));
      if (rule) {
        out += rule.ita;
        i += rule.ipa.length;
      } else {
        out += s[i++];
      }
    }
    return out;
  };

  return function ipaToItalian(ipa: string): string {
    let { syllable } = splitTone(ipa);
    const prefix = rules.ignoredPrefixes.find((p) => syllable.startsWith(p.ipa));
    if (prefix) syllable = syllable.slice(prefix.ipa.length);
    const initial = initials.find((r) => syllable.startsWith(r.ipa));
    const final = mapFinal(syllable.slice(initial?.ipa.length ?? 0));

    let head = initial?.ita ?? "";
    if (initial && final) {
      const isFront = front.has(final[0]);
      if (isFront && initial.beforeFront) head = initial.beforeFront;
      if (!isFront && initial.soft) head += "i";
    }
    return rules.cleanup.reduce((s, c) => s.replaceAll(c.from, c.to), head + final);
  };
}

export const itaRules = rulesJson as ItaRules;
export const ipaToItalian = createIpaToItalian(itaRules);
