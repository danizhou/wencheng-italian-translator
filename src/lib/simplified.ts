import map from "@/data/simplified.json";

const T2S = map as Record<string, string>;

/**
 * Traditional → simplified for display. Data and lookups stay traditional;
 * everything the user sees goes through this.
 */
export function toSimplified(text: string): string {
  return [...text].map((c) => T2S[c] ?? c).join("");
}
