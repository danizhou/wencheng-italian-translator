import { lookup, overrides } from "./lookup";
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

const segment = createSegmenter(lookup, overrides.phrases);
const isKnown = (char: string) => lookup(char) !== null;

/** Chinese text (simplified or traditional) → per-syllable pronunciation. No LLM involved. */
export async function transcribe(chinese: string): Promise<Transcription> {
  const zh = await toTraditional(chinese, isKnown);
  const tokens = segment(zh);
  const missing = [...new Set(tokens.filter((t) => t.kind === "han" && t.ipa === null && t.source === null).map((t) => t.text))];
  return { zh, tokens, ita: italianLine(tokens), missing };
}
