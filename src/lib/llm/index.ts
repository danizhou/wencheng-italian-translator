import { lookup } from "../lookup";
import { toTraditional } from "../opencc";
import { transcribe, type Transcription } from "../pipeline";
import { createAnthropicTranslator, type CompleteTranslation } from "./anthropic";
import type { ProviderId } from "./models";
import { createOpenAiCompatibleTranslator } from "./openaiCompatible";
import { retryPrompt, userPrompt } from "./prompt";
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
const isKnown = (char: string) => lookup(char) !== null;

/** Han characters with no Daxue/Wencheng reading (only Wenzhou, or none at all). */
export function notInWencheng(zh: string): string[] {
  const chars = [...zh].filter((c) => HAN.test(c));
  return [...new Set(chars.filter((c) => {
    const source = lookup(c)?.reading.source;
    return source === undefined || source === "wenzhou";
  }))];
}

/**
 * The whole Italian → Wenchenghua pipeline: one LLM call, at most one coverage
 * retry, then deterministic lookup. Everything but `complete` is plain TypeScript.
 */
export async function translateItalian(italian: string, complete: CompleteTranslation): Promise<TranslateResult> {
  let translation = await complete(userPrompt(italian));
  let zh = await toTraditional(translation.zh, isKnown);
  let retried = false;

  const missing = notInWencheng(zh);
  if (missing.length > 0) {
    retried = true;
    const second = await complete(retryPrompt(italian, zh, missing));
    const secondZh = await toTraditional(second.zh, isKnown);
    // Keep the retry unless it covers fewer characters than the first attempt
    if (notInWencheng(secondZh).length <= missing.length) {
      translation = second;
      zh = secondZh;
    }
  }

  return { translation: { ...translation, zh }, transcription: await transcribe(zh), retried };
}
