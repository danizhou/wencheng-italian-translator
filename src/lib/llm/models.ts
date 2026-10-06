/** The only place model IDs are listed. */
export interface ModelOption {
  id: string;
  /** Shown in the model selector (UI text, Italian) */
  label: string;
  /** output_config.effort; undefined for models that do not accept it */
  effort?: "low" | "medium" | "high";
  /** Retry a refused request on another model, server side */
  fallbacks: boolean;
}

export const MODELS: ModelOption[] = [
  { id: "claude-haiku-4-5", label: "Claude Haiku 4.5 — veloce ed economico", fallbacks: false },
  { id: "claude-sonnet-5-5", label: "Claude Sonnet 5.5 — più accurato", effort: "low", fallbacks: true },
  { id: "claude-opus-5-5", label: "Claude Opus 5.5 — il più capace", effort: "low", fallbacks: true },
];

export const DEFAULT_MODEL = MODELS[0].id;

export const findModel = (id: string): ModelOption => MODELS.find((m) => m.id === id) ?? MODELS[0];
