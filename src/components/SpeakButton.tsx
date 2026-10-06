"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { getSpeechStatus, speak, stopSpeaking, subscribeVoices, type SpeechLang, type SpeechStatus } from "@/lib/speech";

const HINT: Record<SpeechLang, Record<Exclude<SpeechStatus, "ready">, string>> = {
  zh: {
    unsupported: "Il tuo browser non supporta la lettura ad alta voce.",
    "no-voice": "Nessuna voce cinese installata: aggiungila nelle impostazioni di sintesi vocale del dispositivo.",
  },
  it: {
    unsupported: "Il tuo browser non supporta la lettura ad alta voce.",
    "no-voice": "Nessuna voce italiana installata: verrà usata la voce predefinita del dispositivo.",
  },
};

export function useSpeechStatus(lang: SpeechLang): SpeechStatus {
  return useSyncExternalStore(subscribeVoices, () => getSpeechStatus(lang), () => "unsupported");
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
  text: string;
  /** "zh": a Mandarin voice reads the characters; "it": an Italian voice reads the spelling */
  lang: SpeechLang;
  slow?: boolean;
  label: string;
  variant?: "primary" | "secondary" | "compact";
  /** Short tag shown on compact buttons, e.g. "中" or "IT" */
  tag?: string;
}

const STYLE = {
  primary: "bg-appbar px-4 py-2 text-sm text-white hover:opacity-90",
  secondary: "border border-on-accent/20 bg-surface px-3 py-2 text-sm text-text hover:bg-surface-2 dark:border-accent/30",
  compact: "h-9 px-2.5 text-xs text-primary hover:bg-primary-soft",
};

/** Reads text aloud with the browser's own voice for that language. */
export function SpeakButton({ text, lang, slow = false, label, variant = "primary", tag }: Props) {
  const status = useSpeechStatus(lang);
  const [playing, setPlaying] = useState(false);

  useEffect(() => () => stopSpeaking(), []);

  const toggle = async () => {
    if (playing) {
      stopSpeaking();
      setPlaying(false);
      return;
    }
    setPlaying(true);
    await speak(text, { lang, rate: slow ? 0.6 : 0.9 });
    setPlaying(false);
  };

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={status === "unsupported" || !text.trim()}
      title={status === "ready" ? `${label}: “${text}”` : HINT[lang][status]}
      aria-label={variant === "compact" ? `${label}: ${text}` : undefined}
      aria-pressed={playing}
      className={`inline-flex items-center justify-center gap-1.5 rounded-full font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${STYLE[variant]} ${playing ? "ring-2 ring-accent" : ""}`}
    >
      <SpeakerIcon />
      {variant === "compact" ? tag : playing ? "Stop" : label}
    </button>
  );
}

/** Explains a missing voice, as list items under the result. */
export function SpeechNotice() {
  const zh = useSpeechStatus("zh");
  const it = useSpeechStatus("it");
  return (
    <>
      {zh !== "ready" && <li>{HINT.zh[zh]}</li>}
      {it !== "ready" && it !== zh && <li>{HINT.it[it]}</li>}
    </>
  );
}
