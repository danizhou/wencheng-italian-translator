type Convert = (text: string) => string;

let converters: Promise<{ t: Convert; tw: Convert }> | null = null;

/** opencc-js is ~1 MB, so it is loaded only when a conversion is needed. */
function loadConverters() {
  converters ??= import("opencc-js/cn2t").then((OpenCC) => ({
    t: OpenCC.Converter({ from: "cn", to: "t" }),
    tw: OpenCC.Converter({ from: "cn", to: "tw" }),
  }));
  return converters;
}

/**
 * Picks, per character, the first variant the tables know: OpenCC standard
 * traditional (爲), then Taiwan (吃, not 喫), then the original (台).
 * Falls back to the standard conversion when no variant is known or when
 * the conversions do not line up character by character.
 */
export function pickVariants(original: string, t: string, tw: string, isKnown: (char: string) => boolean): string {
  const [o, a, b] = [[...original], [...t], [...tw]];
  if (a.length !== o.length || b.length !== o.length) return t;
  return o.map((char, i) => [a[i], b[i], char].find(isKnown) ?? a[i]).join("");
}

/** Simplified (or mixed) Chinese → traditional characters as used in the tables. */
export async function toTraditional(text: string, isKnown: (char: string) => boolean): Promise<string> {
  const { t, tw } = await loadConverters();
  return pickVariants(text, t(text), tw(text), isKnown);
}
