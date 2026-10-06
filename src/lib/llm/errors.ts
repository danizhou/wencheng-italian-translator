export type LlmErrorKind = "no_key" | "auth" | "rate_limit" | "overloaded" | "network" | "refusal" | "bad_output" | "other";

export class LlmError extends Error {
  constructor(
    readonly kind: LlmErrorKind,
    message: string,
  ) {
    super(message);
    this.name = "LlmError";
  }
}
