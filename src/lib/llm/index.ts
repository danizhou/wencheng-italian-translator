import { findDialect, isAttested, type DialectId } from "../dialects";
import { loadLookup, type Lookup } from "../lookup";
import { toTraditional } from "../opencc";
import { transcribe, type Transcription } from "../pipeline";
import { createAnthropicTranslator, type CompleteTranslation } from "./anthropic";
import type { ProviderId } from "./models";
import { createOpenAiCompatibleTranslator } from "./openaiCompatible";
import { retryPrompt, systemPrompt, userPrompt } from "./prompt";
import type { Translation } from "./schema";

export { createAnthropicTranslator } from "./anthropic";
export { createOpenAiCompatibleTranslator } from "./openaiCompatible";
export { LlmError, type LlmErrorKind } from "./errors";
export * from "./models";

/** The LLM call for the chosen provider. */
export function createTranslator(provider: ProviderId, apiKey: string, modelId: string): CompleteTranslation {
  return provider === "anthropic"
    ? createAnthropicTranslator(apiKey, modelId)
    : createOpenAiCompatibleTranslator(provider, apiKey, modelId);
}

export interface TranslateResult {
  translation: Translation;
  transcription: Transcription;
  /** True when the coverage retry ran */
  retried: boolean;
}

const HAN = /\p{Script=Han}/u;

/** Han characters with no reading in the dialect's own tables (estimated, Wenzhou only, or none at all). */
export function notInDialect(zh: string, lookup: Lookup): string[] {
  const chars = [...zh].filter((c) => HAN.test(c));
  return [...new Set(chars.filter((c) => !isAttested(lookup(c)?.reading.source)))];
}

/**
 * The whole Italian → dialect pipeline: one LLM call, at most one coverage
 * retry, then deterministic lookup. Everything but `complete` is plain TypeScript.
 */
export async function translateItalian(italian: string, complete: CompleteTranslation, dialectId: DialectId): Promise<TranslateResult> {
  const dialect = findDialect(dialectId);
  const lookup = await loadLookup(dialect.id);
  const isKnown = (char: string) => lookup(char) !== null;
  const system = systemPrompt(dialect);

  let translation = await complete(system, userPrompt(italian));
  let zh = await toTraditional(translation.zh, isKnown);
  let retried = false;

  const missing = notInDialect(zh, lookup);
  if (missing.length > 0) {
    retried = true;
    const second = await complete(system, retryPrompt(dialect, italian, zh, missing));
    const secondZh = await toTraditional(second.zh, isKnown);
    // Keep the retry unless it covers fewer characters than the first attempt
    if (notInDialect(secondZh, lookup).length <= missing.length) {
      translation = second;
      zh = secondZh;
    }
  }

  return { translation: { ...translation, zh }, transcription: await transcribe(zh, dialect.id), retried };
}
