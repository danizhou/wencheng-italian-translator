import type { LookupResult, Overrides, SourcedReading } from "./lookup";
import type { Source } from "./data-types";
import { ipaToItalian } from "./ita";

export type TokenSource = Source | "override" | "phrase";

export interface Token {
  /** One Han character, or a run of other characters (punctuation, spaces, Latin) */
  text: string;
  kind: "han" | "other";
  ipa: string | null;
  tone: number | null;
  /** Italian spelling; "?" for a Han character missing from every table */
  ita: string;
  /** null for "other" tokens and for unknown Han characters */
  source: TokenSource | null;
  alts: SourcedReading[];
}

const HAN = /\p{Script=Han}/u;

const PUNCTUATION: Record<string, string> = {
  "，": ",", "。": ".", "？": "?", "！": "!", "、": ",", "：": ":", "；": ";",
  "「": "\"", "」": "\"", "『": "\"", "』": "\"", "（": "(", "）": ")", "　": " ",
};

export function createSegmenter(lookup: (char: string) => LookupResult | null, phrases: Overrides["phrases"]) {
  const phraseList = Object.entries(phrases).map(([zh, p]) => {
    const chars = [...zh];
    const syllables = p.ita.trim().split(/\s+/);
    if (syllables.length !== chars.length) {
      throw new Error(`Phrase override ${zh}: ${chars.length} characters but ${syllables.length} syllables in "${p.ita}"`);
    }
    return { chars, syllables };
  });
  phraseList.sort((a, b) => b.chars.length - a.chars.length);

  const hanToken = (char: string, ita?: string): Token => {
    const r = lookup(char);
    if (!r) return { text: char, kind: "han", ipa: null, tone: null, ita: ita ?? "?", source: ita ? "phrase" : null, alts: [] };
    return {
      text: char,
      kind: "han",
      ipa: r.reading.ipa,
      tone: r.reading.tone,
      ita: ita ?? ipaToItalian(r.reading.ipa),
      source: ita ? "phrase" : r.reading.source,
      alts: r.alts,
    };
  };

  /** Phrase overrides (greedy longest match, left to right) → char override → tables. */
  return function segment(text: string): Token[] {
    const chars = [...text];
    const tokens: Token[] = [];
    for (let i = 0; i < chars.length; ) {
      const phrase = phraseList.find((p) => p.chars.every((c, j) => chars[i + j] === c));
      if (phrase) {
        phrase.chars.forEach((c, j) => tokens.push(hanToken(c, phrase.syllables[j])));
        i += phrase.chars.length;
      } else if (HAN.test(chars[i])) {
        tokens.push(hanToken(chars[i++]));
      } else {
        let run = "";
        while (i < chars.length && !HAN.test(chars[i])) run += chars[i++];
        const ita = [...run].map((c) => PUNCTUATION[c] ?? c).join("");
        tokens.push({ text: run, kind: "other", ipa: null, tone: null, ita, source: null, alts: [] });
      }
    }
    return tokens;
  };
}

/** "gni va ci cu nau?" — syllables separated by spaces, punctuation attached to the previous word. */
export function italianLine(tokens: Token[]): string {
  let out = "";
  for (const t of tokens) {
    const text = t.kind === "han" ? t.ita : t.ita.trim().replace(/\s+/g, " ");
    if (!text) continue;
    const attach = !out || (t.kind === "other" && /^[,.?!:;)"]/.test(text));
    out += (attach ? "" : " ") + text;
  }
  return out;
}
