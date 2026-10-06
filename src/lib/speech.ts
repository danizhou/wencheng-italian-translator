/**
 * Reads the pronunciation aloud with the browser's own speech synthesis (Web
 * Speech API): a Vietnamese voice reads the Vietnamese respelling of the IPA
 * (src/lib/vi.ts), with tones. No network, no key. No voice speaks Wenchenghua;
 * Vietnamese is the closest one phones ship with, still an approximation.
 */

const LANG_TAG = "vi-VN";

const normalize = (lang: string) => lang.toLowerCase().replace("_", "-");

/** Best Vietnamese voice (vi-VN first, local voices first); null if there is none. */
export function pickVoice<V extends { lang: string; localService?: boolean }>(voices: readonly V[]): V | null {
  const langRank = (tag: string): number => (tag === "vi-vn" ? 0 : tag.startsWith("vi") ? 1 : Infinity);
  const rank = (v: V) => langRank(normalize(v.lang)) + (v.localService ? 0 : 0.5);
  const best = [...voices].sort((a, b) => rank(a) - rank(b))[0];
  return best && rank(best) !== Infinity ? best : null;
}

export const isSpeechSupported = () => typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;

/** Speaks the Vietnamese text; resolves when done or cancelled. Stops anything already playing. */
export function speak(text: string, { rate = 0.9 }: { rate?: number } = {}): Promise<void> {
  return new Promise((resolve) => {
    if (!isSpeechSupported() || !text.trim()) return resolve();
    const synth = window.speechSynthesis;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = LANG_TAG;
    utterance.rate = rate;
    const voice = pickVoice(synth.getVoices());
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

export function getSpeechStatus(): SpeechStatus {
  if (!isSpeechSupported()) return "unsupported";
  return pickVoice(window.speechSynthesis.getVoices()) ? "ready" : "no-voice";
}

export function subscribeVoices(onChange: () => void): () => void {
  if (!isSpeechSupported()) return () => {};
  const synth = window.speechSynthesis;
  synth.addEventListener?.("voiceschanged", onChange);
  return () => synth.removeEventListener?.("voiceschanged", onChange);
}
