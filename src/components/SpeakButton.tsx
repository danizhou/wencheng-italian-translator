"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { getSpeechStatus, speak, stopSpeaking, subscribeVoices, type SpeechStatus } from "@/lib/speech";

const HINT: Record<Exclude<SpeechStatus, "ready">, string> = {
  unsupported: "Il tuo browser non supporta la lettura ad alta voce.",
  "no-voice": "Nessuna voce vietnamita installata: aggiungila nelle impostazioni di sintesi vocale del dispositivo.",
};

export function useSpeechStatus(): SpeechStatus {
  return useSyncExternalStore(subscribeVoices, getSpeechStatus, () => "unsupported");
}

function SpeakerIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4 fill-none stroke-current" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 5 6 9H2v6h4l5 4V5z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" />
    </svg>
  );
}

interface Props {
  /** Vietnamese respelling to read (src/lib/vi.ts) */
  text: string;
  slow?: boolean;
  label: string;
  compact?: boolean;
}

/** Reads the pronunciation aloud with the device's Vietnamese voice. */
export function SpeakButton({ text, slow = false, label, compact = false }: Props) {
  const status = useSpeechStatus();
  const [playing, setPlaying] = useState(false);

  useEffect(() => () => stopSpeaking(), []);

  const toggle = async () => {
    if (playing) {
      stopSpeaking();
      setPlaying(false);
      return;
    }
    setPlaying(true);
    await speak(text, { rate: slow ? 0.6 : 0.9 });
    setPlaying(false);
  };

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={status === "unsupported" || !text.trim()}
      title={status === "ready" ? `${label}: “${text}”` : HINT[status]}
      aria-label={compact ? `${label}: ${text}` : undefined}
      aria-pressed={playing}
      className={`inline-flex items-center justify-center gap-1.5 rounded-full font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
        compact ? "size-9 text-primary hover:bg-primary-soft" : "bg-appbar px-4 py-2 text-sm text-white hover:opacity-90"
      } ${playing ? "ring-2 ring-accent" : ""}`}
    >
      <SpeakerIcon />
      {!compact && (playing ? "Stop" : label)}
    </button>
  );
}

/** Explains a missing voice, as a list item under the result. */
export function SpeechNotice() {
  const status = useSpeechStatus();
  return status === "ready" ? null : <li>{HINT[status]}</li>;
}
