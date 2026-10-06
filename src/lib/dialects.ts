import type { Source } from "./data-types";

export type DialectId = "wencheng" | "qingtian";

export interface Dialect {
  id: DialectId;
  /** Shown in the UI and in the LLM prompt */
  name: string;
  /** Traditional, like all data; shown through toSimplified */
  han: string;
  /** Short description of the place, for the LLM prompt */
  place: string;
  /** Main MCPDict table, credited on the share card */
  table: string;
}

export const DIALECTS: Dialect[] = [
  { id: "wencheng", name: "Wencheng", han: "文成話", place: "Wencheng county, Wenzhou, Zhejiang", table: "文成大嶨" },
  { id: "qingtian", name: "Qingtian", han: "青田話", place: "Qingtian county, Lishui, Zhejiang; close to Wenzhounese", table: "青田溫溪" },
];

export const DEFAULT_DIALECT: DialectId = "wencheng";

/** The city table every dialect falls back to; its syllables are flagged in the UI. */
export const FALLBACK_SOURCE: Source = "wenzhou";

/** A dialect reading guessed from the fallback one (scripts/build-data.ts); flagged in the UI too. */
export const ESTIMATED_SOURCE: Source = "estimated";

/** True when the reading really comes from the dialect's own tables (or an override). */
export const isAttested = (source: string | null | undefined): boolean =>
  !!source && source !== FALLBACK_SOURCE && source !== ESTIMATED_SOURCE;

export const findDialect = (id: string): Dialect => DIALECTS.find((d) => d.id === id) ?? DIALECTS[0];
