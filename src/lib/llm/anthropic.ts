import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { LlmError } from "./errors";
import { findModel } from "./models";
import { SYSTEM_PROMPT } from "./prompt";
import { TranslationSchema, type Translation } from "./schema";

export type CompleteTranslation = (userMessage: string) => Promise<Translation>;

/**
 * Calls Anthropic straight from the browser with the user's own key.
 * The key goes only to api.anthropic.com; it is never logged or sent to our domain.
 */
export function createAnthropicTranslator(apiKey: string, modelId: string): CompleteTranslation {
  if (!apiKey.trim()) throw new LlmError("no_key", "Missing API key");
  const client = new Anthropic({ apiKey: apiKey.trim(), dangerouslyAllowBrowser: true, maxRetries: 1 });
  const model = findModel(modelId);

  return async (userMessage) => {
    try {
      const response = await client.beta.messages.parse({
        model: model.id,
        max_tokens: 4000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
        output_config: {
          format: betaZodOutputFormat(TranslationSchema),
          ...(model.effort ? { effort: model.effort } : {}),
        },
        ...(model.fallbacks ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
      });
      if (response.stop_reason === "refusal") throw new LlmError("refusal", "The model declined this request");
      if (!response.parsed_output) throw new LlmError("bad_output", `Unparseable model output (stop_reason: ${response.stop_reason})`);
      return response.parsed_output;
    } catch (error) {
      throw toLlmError(error);
    }
  };
}

function toLlmError(error: unknown): LlmError {
  if (error instanceof LlmError) return error;
  if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
    return new LlmError("auth", "Invalid API key");
  }
  if (error instanceof Anthropic.RateLimitError) return new LlmError("rate_limit", "Rate limited");
  if (error instanceof Anthropic.InternalServerError) return new LlmError("overloaded", "Provider error or overloaded");
  if (error instanceof Anthropic.APIConnectionError) return new LlmError("network", "Network error");
  if (error instanceof Anthropic.APIError) return new LlmError("other", `API error ${error.status}`);
  return new LlmError("other", error instanceof Error ? error.message : String(error));
}
