import data from "@/data/phrases.json";
import type { DialectId } from "./dialects";
import { ipaToItalian } from "./ita";
import { loadLookup, overrides } from "./lookup";
import { createSegmenter, italianLine, type Token } from "./segment";

export interface Phrase {
  id: string;
  category: string;
  it: string;
  /** Traditional characters, as used internally */
  zh: string;
  /** Matches the plan's reference table (Wencheng); others still need a native speaker */
  verified?: boolean;
  /** Wencheng reading to use for a character instead of the default (an IPA from its alternatives) */
  pick?: Record<string, string>;
}

export interface PhraseCategory {
  id: string;
  label: string;
}

export const PHRASE_CATEGORIES = data.categories as PhraseCategory[];
export const PHRASES = data.phrases as Phrase[];

/** The phrases were written, verified and given their `pick` readings for this dialect only. */
const PHRASES_DIALECT: DialectId = "wencheng";

export const isVerified = (phrase: Phrase, dialect: DialectId): boolean => dialect === PHRASES_DIALECT && !!phrase.verified;

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

/** Tokens and Italian line of a ready-made phrase in one dialect, with its picked readings (Wencheng only). No opencc needed. */
export async function transcribePhrase(phrase: Phrase, dialect: DialectId): Promise<{ tokens: Token[]; ita: string }> {
  const segment = createSegmenter(await loadLookup(dialect), overrides[dialect].phrases);
  const pick = dialect === PHRASES_DIALECT ? phrase.pick : undefined;
  const tokens = segment(phrase.zh).map((t) => (pick?.[t.text] ? withReading(t, pick[t.text]) : t));
  return { tokens, ita: italianLine(tokens) };
}
