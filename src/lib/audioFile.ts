/**
 * Downloadable audio. The browser's speech voice cannot be recorded, so the file
 * is generated with Piper (open-source TTS, MIT) running in the browser via
 * ONNX: a Vietnamese voice reads the Vietnamese respelling of the IPA.
 * The voice model is downloaded once from Hugging Face and kept in the
 * browser (Origin Private File System). No key, nothing sent to our server.
 */

/** Single-speaker Vietnamese voice: one consistent voice for every file */
export const VOICE_ID = "vi_VN-25hours_single-low";
/** Shown to the user before the first download */
export const VOICE_SIZE_MB = 63;

export type AudioStage = { stage: "voice"; fraction: number } | { stage: "audio" };

const INFERENCE_PROGRESS = "tts://inference-progress";

/** The WAV for a Vietnamese text; reports the one-time voice download, then the synthesis. */
export async function synthesizeVietnamese(text: string, onProgress?: (stage: AudioStage) => void): Promise<Blob> {
  if (!text.trim()) throw new Error("Nothing to read");
  const tts = await import("@mintplex-labs/piper-tts-web");
  onProgress?.({ stage: "audio" });
  return tts.predict({ text, voiceId: VOICE_ID }, (p) => {
    if (p.url === INFERENCE_PROGRESS) onProgress?.({ stage: "audio" });
    else if (p.url.endsWith(".onnx")) onProgress?.({ stage: "voice", fraction: p.total ? p.loaded / p.total : 0 });
  });
}

/** Whether the voice is already stored in this browser (no download needed). */
export async function isVoiceStored(): Promise<boolean> {
  try {
    const tts = await import("@mintplex-labs/piper-tts-web");
    return (await tts.stored()).includes(VOICE_ID);
  } catch {
    return false;
  }
}

/** "Hai mangiato?" → "wenchenghua-hai-mangiato.wav" */
export function audioFileName(italian: string): string {
  const slug = italian
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `wenchenghua${slug ? `-${slug}` : ""}.wav`;
}

/** Saves a blob as a file on the user's device. */
export function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
