import data from "@/data/phrases.json";
import { ipaToItalian } from "./ita";
import { lookup, overrides } from "./lookup";
import { createSegmenter, italianLine, type Token } from "./segment";

export interface Phrase {
  id: string;
  category: string;
  it: string;
  /** Traditional characters, as used internally */
  zh: string;
  /** Matches the plan's reference table; others still need a native speaker */
  verified?: boolean;
  /** Reading to use for a character instead of the default (an IPA from its alternatives) */
  pick?: Record<string, string>;
}

export interface PhraseCategory {
  id: string;
  label: string;
}

export const PHRASE_CATEGORIES = data.categories as PhraseCategory[];
export const PHRASES = data.phrases as Phrase[];

const segment = createSegmenter(lookup, overrides.phrases);

/** Switches a token to one of its alternative readings. */
export function withReading(token: Token, ipa: string): Token {
  if (!token.ipa || token.ipa === ipa) return token;
  const alt = token.alts.find((a) => a.ipa === ipa);
  if (!alt) return token;
  const previous = { ipa: token.ipa, tone: token.tone ?? 0, source: token.source === "phrase" || !token.source ? ("override" as const) : token.source };
  return {
    ...token,
    ipa: alt.ipa,
    tone: alt.tone,
    ita: ipaToItalian(alt.ipa),
    source: alt.source,
    alts: [previous, ...token.alts.filter((a) => a.ipa !== alt.ipa)],
  };
}

/** Tokens and Italian line of a ready-made phrase, with its per-character readings. Synchronous: no opencc needed. */
export function transcribePhrase(phrase: Phrase): { tokens: Token[]; ita: string } {
  const tokens = segment(phrase.zh).map((t) => (phrase.pick?.[t.text] ? withReading(t, phrase.pick[t.text]) : t));
  return { tokens, ita: italianLine(tokens) };
}
