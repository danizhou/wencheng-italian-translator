/**
 * Reads the result aloud with the browser's own speech synthesis (Web Speech
 * API). No network, no key. Two voices:
 * - Vietnamese: reads the Vietnamese respelling of the IPA (src/lib/vi.ts),
 *   with tones. The closest available sound to Wencheng; still an approximation.
 * - Italian: reads the Italian spelling ("gni va ci cu nau").
 */

export type SpeechLang = "vi" | "it";

const LANG_TAG: Record<SpeechLang, string> = { vi: "vi-VN", it: "it-IT" };

/** Syllables an Italian voice would spell out letter by letter, and what to say instead. */
const UNSPEAKABLE: Record<string, string> = { ng: "eng", z: "ze", s: "se" };

/** One Italian syllable, made pronounceable for an Italian voice. */
export function speakableSyllable(ita: string): string {
  const syllable = ita.toLowerCase();
  if (UNSPEAKABLE[syllable]) return UNSPEAKABLE[syllable];
  // Italian has no ü: "iu" is the closest sound, without doubling an i before it
  return syllable.replace(/i?ü/g, "iu");
}

/** A whole Italian line ("ng ciü meng la?") made pronounceable, punctuation kept. */
export function speakableLine(line: string): string {
  return line.replace(/[a-zèü]+/gi, speakableSyllable);
}

const normalize = (lang: string) => lang.toLowerCase().replace("_", "-");

/** Best voice for the language (vi-VN / it-IT first, local voices first); null if there is none. */
export function pickVoice<V extends { lang: string; localService?: boolean }>(voices: readonly V[], lang: SpeechLang): V | null {
  const langRank = (tag: string): number => (tag === LANG_TAG[lang].toLowerCase() ? 0 : tag.startsWith(lang) ? 1 : Infinity);
  const rank = (v: V) => langRank(normalize(v.lang)) + (v.localService ? 0 : 0.5);
  const best = [...voices].sort((a, b) => rank(a) - rank(b))[0];
  return best && rank(best) !== Infinity ? best : null;
}

export const isSpeechSupported = () => typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;

/**
 * Speaks the text; resolves when done or cancelled. Stops anything already playing.
 * Italian text is made pronounceable first; Vietnamese text is read as given.
 */
export function speak(text: string, { lang = "it", rate = 0.9 }: { lang?: SpeechLang; rate?: number } = {}): Promise<void> {
  return new Promise((resolve) => {
    if (!isSpeechSupported() || !text.trim()) return resolve();
    const synth = window.speechSynthesis;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(lang === "it" ? speakableLine(text) : text);
    utterance.lang = LANG_TAG[lang];
    utterance.rate = rate;
    const voice = pickVoice(synth.getVoices(), lang);
    if (voice) utterance.voice = voice;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    synth.speak(utterance);
  });
}

export function stopSpeaking() {
  if (isSpeechSupported()) window.speechSynthesis.cancel();
}

/** For useSyncExternalStore. Voices load asynchronously. */
export type SpeechStatus = "unsupported" | "no-voice" | "ready";

export function getSpeechStatus(lang: SpeechLang): SpeechStatus {
  if (!isSpeechSupported()) return "unsupported";
  return pickVoice(window.speechSynthesis.getVoices(), lang) ? "ready" : "no-voice";
}

export function subscribeVoices(onChange: () => void): () => void {
  if (!isSpeechSupported()) return () => {};
  const synth = window.speechSynthesis;
  synth.addEventListener?.("voiceschanged", onChange);
  return () => synth.removeEventListener?.("voiceschanged", onChange);
}
