import type { DialectId } from "./dialects";
import { loadLookup, overrides } from "./lookup";
import { toTraditional } from "./opencc";
import { createSegmenter, italianLine, type Token } from "./segment";

export interface Transcription {
  /** Input normalized to the traditional characters used by the tables */
  zh: string;
  tokens: Token[];
  /** Italian spelling of the whole sentence */
  ita: string;
  /** Han characters found in no table */
  missing: string[];
}

/** Chinese text (simplified or traditional) → per-syllable pronunciation in one dialect. No LLM involved. */
export async function transcribe(chinese: string, dialect: DialectId): Promise<Transcription> {
  const lookup = await loadLookup(dialect);
  const zh = await toTraditional(chinese, (char) => lookup(char) !== null);
  const tokens = createSegmenter(lookup, overrides[dialect].phrases)(zh);
  const missing = [...new Set(tokens.filter((t) => t.kind === "han" && t.ipa === null && t.source === null).map((t) => t.text))];
  return { zh, tokens, ita: italianLine(tokens), missing };
}
