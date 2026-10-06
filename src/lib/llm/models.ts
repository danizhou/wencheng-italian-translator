/** The only place providers and model IDs are listed. */
export type ProviderId = "anthropic" | "openai" | "xai";

export interface ProviderInfo {
  id: ProviderId;
  /** UI text (Italian) */
  label: string;
  /** API host the key is sent to; nothing else ever sees it */
  host: string;
  consoleUrl: string;
  keyPlaceholder: string;
}

export const PROVIDERS: Record<ProviderId, ProviderInfo> = {
  anthropic: {
    id: "anthropic",
    label: "Anthropic (Claude)",
    host: "api.anthropic.com",
    consoleUrl: "https://console.anthropic.com/settings/keys",
    keyPlaceholder: "sk-ant-…",
  },
  openai: {
    id: "openai",
    label: "OpenAI (GPT)",
    host: "api.openai.com",
    consoleUrl: "https://platform.openai.com/api-keys",
    keyPlaceholder: "sk-…",
  },
  xai: {
    id: "xai",
    label: "xAI (Grok)",
    host: "api.x.ai",
    consoleUrl: "https://console.x.ai",
    keyPlaceholder: "xai-…",
  },
};

export const PROVIDER_IDS = Object.keys(PROVIDERS) as ProviderId[];

export interface ModelOption {
  id: string;
  provider: ProviderId;
  /** Shown in the model selector (UI text, Italian) */
  label: string;
  /** Anthropic output_config.effort; undefined for models that do not accept it */
  effort?: "low" | "medium" | "high";
  /** Anthropic: retry a refused request on another model, server side */
  fallbacks: boolean;
}

export const MODELS: ModelOption[] = [
  { id: "claude-haiku-4-5", provider: "anthropic", label: "Claude Haiku 4.5 — veloce ed economico", fallbacks: false },
  { id: "claude-sonnet-5-5", provider: "anthropic", label: "Claude Sonnet 5.5 — più accurato", effort: "low", fallbacks: true },
  { id: "claude-opus-5-5", provider: "anthropic", label: "Claude Opus 5.5 — il più capace", effort: "low", fallbacks: true },
  { id: "gpt-5.4-nano", provider: "openai", label: "GPT-5.4 nano — veloce ed economico", fallbacks: false },
  { id: "gpt-5.4-mini", provider: "openai", label: "GPT-5.4 mini — più accurato", fallbacks: false },
  { id: "grok-4.7", provider: "xai", label: "Grok 4.7", fallbacks: false },
];

export const DEFAULT_PROVIDER: ProviderId = "anthropic";
export const DEFAULT_MODEL = MODELS[0].id;

export const modelsFor = (provider: ProviderId) => MODELS.filter((m) => m.provider === provider);

export const defaultModelFor = (provider: ProviderId) => modelsFor(provider)[0].id;

export const isProvider = (value: string | null): value is ProviderId => !!value && value in PROVIDERS;

/** A listed model, or a custom ID the user typed for that provider. */
export function findModel(id: string, provider?: ProviderId): ModelOption {
  const known = MODELS.find((m) => m.id === id && (!provider || m.provider === provider));
  if (known) return known;
  if (provider && id.trim()) return { id: id.trim(), provider, label: id.trim(), fallbacks: false };
  return MODELS[0];
}
