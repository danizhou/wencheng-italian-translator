/**
 * Reads the Italian spelling aloud with the browser's own speech synthesis
 * (Web Speech API). No network, no key. This is the "meme" pronunciation:
 * an Italian voice reading "gni va ci cu nau", not a Wencheng speaker.
 */

/** Syllables an Italian voice would spell out letter by letter, and what to say instead. */
const UNSPEAKABLE: Record<string, string> = { ng: "eng", z: "ze", s: "se" };

/** One syllable, made pronounceable for an Italian voice. */
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

/** Prefers an Italian (Italy) voice, then any Italian voice; null if there is none. */
export function pickItalianVoice<V extends { lang: string; localService?: boolean }>(voices: readonly V[]): V | null {
  const italian = voices.filter((v) => v.lang.toLowerCase().replace("_", "-").startsWith("it"));
  const rank = (v: V) => (v.lang.toLowerCase().replace("_", "-") === "it-it" ? 0 : 1) + (v.localService ? 0 : 0.5);
  return [...italian].sort((a, b) => rank(a) - rank(b))[0] ?? null;
}

export const isSpeechSupported = () => typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;

/** Speaks the text; resolves when done or cancelled. Stops anything already playing. */
export function speak(text: string, { rate = 0.9 }: { rate?: number } = {}): Promise<void> {
  return new Promise((resolve) => {
    if (!isSpeechSupported() || !text.trim()) return resolve();
    const synth = window.speechSynthesis;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(speakableLine(text));
    utterance.lang = "it-IT";
    utterance.rate = rate;
    const voice = pickItalianVoice(synth.getVoices());
    if (voice) utterance.voice = voice;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    synth.speak(utterance);
  });
}

export function stopSpeaking() {
  if (isSpeechSupported()) window.speechSynthesis.cancel();
}

/** For useSyncExternalStore: "unsupported" | "no-italian-voice" | "ready". Voices load asynchronously. */
export type SpeechStatus = "unsupported" | "no-italian-voice" | "ready";

export function getSpeechStatus(): SpeechStatus {
  if (!isSpeechSupported()) return "unsupported";
  return pickItalianVoice(window.speechSynthesis.getVoices()) ? "ready" : "no-italian-voice";
}

export function subscribeVoices(onChange: () => void): () => void {
  if (!isSpeechSupported()) return () => {};
  const synth = window.speechSynthesis;
  synth.addEventListener?.("voiceschanged", onChange);
  return () => synth.removeEventListener?.("voiceschanged", onChange);
}
