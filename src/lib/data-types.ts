/** Shape of the generated dialect files in src/data (wencheng.json, qingtian.json), built by scripts/build-data.ts. */

/**
 * One MCPDict table (Wenzhou is the shared fallback of every dialect), or
 * "estimated": a reading guessed from the Wenzhou one by build-data.ts.
 */
export type Source = "daxue" | "wencheng" | "wenxi" | "beishan" | "qingtian" | "wenzhou" | "estimated";

export interface Reading {
  /** IPA with trailing tone digit, e.g. "ȵi4" */
  ipa: string;
  /** 0 = neutral tone, 1–8 = the eight Wu tone categories */
  tone: number;
  gloss?: string;
}

export interface SourceReadings {
  source: Source;
  readings: Reading[];
}

export interface CharEntry extends SourceReadings {
  /** Readings from lower-priority sources, in priority order */
  alt?: SourceReadings[];
}

export interface DialectData {
  /** `files` lists the MCPDict tables used, highest priority first */
  meta: { generated: string; repo: string; commit: string; files: Partial<Record<Source, string>> };
  chars: Record<string, CharEntry>;
}
