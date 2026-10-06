import { LlmError } from "./errors";
import { PROVIDERS, type ProviderId } from "./models";
import { TranslationSchema } from "./schema";
import type { CompleteTranslation } from "./anthropic";

const BASE_URL: Record<Exclude<ProviderId, "anthropic">, string> = {
  openai: `https://${PROVIDERS.openai.host}/v1`,
  xai: `https://${PROVIDERS.xai.host}/v1`,
};

/** JSON schema for strict structured outputs; mirrors TranslationSchema (the response is validated with it). */
const RESPONSE_FORMAT = {
  type: "json_schema",
  json_schema: {
    name: "translation",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["zh", "words", "confidence", "note"],
      properties: {
        zh: { type: "string" },
        words: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["zh", "it"],
            properties: { zh: { type: "string" }, it: { type: "string" } },
          },
        },
        confidence: { type: "string", enum: ["alta", "media", "bassa"] },
        note: { type: "string" },
      },
    },
  },
} as const;

interface ChatCompletion {
  choices?: { message?: { content?: string | null; refusal?: string | null }; finish_reason?: string }[];
}

/**
 * OpenAI and xAI share the Chat Completions API. Plain fetch keeps the browser
 * request minimal (only Authorization and Content-Type), so CORS preflights stay
 * simple. The key goes only to the provider's API host.
 */
export function createOpenAiCompatibleTranslator(provider: "openai" | "xai", apiKey: string, model: string): CompleteTranslation {
  if (!apiKey.trim()) throw new LlmError("no_key", "Missing API key");
  const key = apiKey.trim();

  return async (system, userMessage) => {
    let response: Response;
    try {
      response = await fetch(`${BASE_URL[provider]}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: system },
            { role: "user", content: userMessage },
          ],
          response_format: RESPONSE_FORMAT,
        }),
      });
    } catch {
      throw new LlmError("network", "Network error (or the provider blocks browser requests)");
    }

    if (!response.ok) throw statusError(response.status);

    let body: ChatCompletion;
    try {
      body = (await response.json()) as ChatCompletion;
    } catch {
      throw new LlmError("bad_output", "Response is not JSON");
    }
    const message = body.choices?.[0]?.message;
    if (message?.refusal) throw new LlmError("refusal", "The model declined this request");
    if (!message?.content) throw new LlmError("bad_output", "Empty model output");

    try {
      return TranslationSchema.parse(JSON.parse(message.content));
    } catch {
      throw new LlmError("bad_output", "Model output does not match the schema");
    }
  };
}

function statusError(status: number): LlmError {
  if (status === 401 || status === 403) return new LlmError("auth", "Invalid API key");
  if (status === 429) return new LlmError("rate_limit", "Rate limited or out of credit");
  if (status >= 500) return new LlmError("overloaded", "Provider error or overloaded");
  if (status === 404) return new LlmError("other", "Unknown model");
  return new LlmError("other", `API error ${status}`);
}
