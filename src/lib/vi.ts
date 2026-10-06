import rulesJson from "@/data/vi-rules.json";
import { splitTone } from "./ita";
import type { Token } from "./segment";

/**
 * IPA → Vietnamese spelling, so a Vietnamese voice can read the pronunciation
 * with tones. Vietnamese has many Wu sounds (ng-, nh, ư, ơ, đ, gi) and tones
 * that map onto the Wenzhou contours; it is still an approximation.
 */
export interface ViRules {
  ignoredPrefixes: string[];
  syllabicNasals: string[];
  syllabicNasal: string;
  initials: Record<string, string>;
  finals: Record<string, string>;
  tones: Record<string, ToneName | "">;
}

type ToneName = "huyen" | "sac" | "nga" | "nang" | "hoi";

const TONE_MARK: Record<ToneName, string> = {
  huyen: "̀", // grave
  sac: "́", // acute
  nga: "̃", // tilde
  nang: "̣", // dot below
  hoi: "̉", // hook above
};

const VOWELS = "aăâeêioôơuưy";
/** Vowels that take the tone mark first, in priority order (ươ → mark on ơ) */
const PRIORITY = ["ơ", "ê", "ô", "â", "ă", "ư"];

/** Puts the tone mark on the right vowel, following Vietnamese spelling. */
export function placeTone(syllable: string, tone: ToneName | ""): string {
  if (!tone) return syllable;
  const chars = [...syllable];
  let index = -1;
  for (const p of PRIORITY) {
    const i = chars.lastIndexOf(p);
    if (i !== -1) {
      index = i;
      break;
    }
  }
  if (index === -1) {
    // The vowel group, skipping a "qu"/"gi" onset whose u/i is not a vowel
    let start = chars.findIndex((c) => VOWELS.includes(c));
    const onset = chars.slice(0, start + 1).join("");
    const next = chars[start + 1];
    const glide = onset.endsWith("qu") || onset.endsWith("gi");
    if (start !== -1 && glide && next !== undefined && VOWELS.includes(next)) start += 1;
    let end = start;
    while (end + 1 < chars.length && VOWELS.includes(chars[end + 1])) end++;
    const group = chars.slice(start, end + 1).join("");
    const closed = end < chars.length - 1;
    if (closed || group.length === 1) index = end;
    else if (["oa", "oe", "uy"].includes(group)) index = end;
    else if (group.length === 3) index = start + 1;
    else index = start;
  }
  chars[index] = (chars[index] + TONE_MARK[tone]).normalize("NFC");
  return chars.join("");
}

/** Vietnamese spelling rules for joining an initial and a rhyme (c/k/qu, g/gh, ng/ngh, gi+i, y). */
function join(initial: string, rhyme: string): string {
  const front = /^[ieê]/.test(rhyme);
  if (initial === "c") {
    if (/^(o[a]|uy|uâ)/.test(rhyme)) return `qu${rhyme.slice(1)}`;
    return front ? `k${rhyme}` : `c${rhyme}`;
  }
  if (initial === "g") return front ? `gh${rhyme}` : `g${rhyme}`;
  if (initial === "ng") return front ? `ngh${rhyme}` : `ng${rhyme}`;
  if (initial === "gi") return rhyme.startsWith("i") ? `gi${rhyme.slice(1)}` : `gi${rhyme}`;
  if (initial === "") {
    if (rhyme === "i") return "y";
    if (rhyme.startsWith("iê")) return `y${rhyme.slice(1)}`;
  }
  return initial + rhyme;
}

export function createIpaToVietnamese(rules: ViRules) {
  const initials = Object.keys(rules.initials).sort((a, b) => b.length - a.length);
  const nasals = [...rules.syllabicNasals].sort((a, b) => b.length - a.length);

  return function ipaToVietnamese(ipa: string): string {
    const { syllable: raw, tone } = splitTone(ipa);
    const toneName = rules.tones[String(tone ?? 0)] ?? "";
    if (nasals.some((n) => raw === n)) return placeTone(rules.syllabicNasal, toneName);

    let syllable = raw;
    const prefix = rules.ignoredPrefixes.find((p) => syllable.startsWith(p));
    if (prefix) syllable = syllable.slice(prefix.length);

    const initial = initials.find((i) => syllable.startsWith(i));
    const final = syllable.slice(initial?.length ?? 0);
    const rhyme = rules.finals[final];
    // Unknown final: keep the raw letters so it is visible in tests
    const spelled = join(initial ? rules.initials[initial] : "", rhyme ?? final);
    return placeTone(spelled, toneName);
  };
}

export const viRules = rulesJson as ViRules;
export const ipaToVietnamese = createIpaToVietnamese(viRules);

/** The sentence as a Vietnamese voice should read it: one word per syllable, punctuation kept. */
export function vietnameseLine(tokens: Token[]): string {
  let out = "";
  for (const t of tokens) {
    const text = t.kind === "han" ? (t.ipa ? ipaToVietnamese(t.ipa) : "") : t.ita.trim();
    if (!text) continue;
    const attach = !out || (t.kind === "other" && /^[,.?!:;)"]/.test(text));
    out += (attach ? "" : " ") + text;
  }
  return out;
}
