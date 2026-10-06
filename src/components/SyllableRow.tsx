"use client";

import type { Token } from "@/lib/segment";
import type { SourcedReading } from "@/lib/lookup";
import { ipaToItalian } from "@/lib/ita";
import { SOURCE_LABEL } from "./labels";

interface Props {
  tokens: Token[];
  selected: number | null;
  onSelect: (index: number | null) => void;
  onChooseAlt: (index: number, alt: SourcedReading) => void;
}

const TONE_SUPERSCRIPT = "⁰¹²³⁴⁵⁶⁷⁸";

function syllableClass(t: Token, isSelected: boolean) {
  const base = "flex min-w-12 flex-col items-center gap-0.5 rounded-lg px-1.5 py-1.5 transition";
  const state =
    t.source === null ? "bg-red-50 text-red-800 dark:bg-red-950/60 dark:text-red-300"
    : t.source === "wenzhou" ? "bg-amber-50 ring-1 ring-amber-300 dark:bg-amber-950/50 dark:ring-amber-700"
    : "hover:bg-zinc-100 dark:hover:bg-zinc-800";
  return `${base} ${state} ${isSelected ? "ring-2 ring-sky-500" : ""}`;
}

export function SyllableRow({ tokens, selected, onSelect, onChooseAlt }: Props) {
  const current = selected !== null ? tokens[selected] : null;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-1" data-testid="syllables">
        {tokens.map((t, i) =>
          t.kind === "other" ? (
            <span key={i} className="self-end pb-2 text-2xl text-zinc-400">{t.ita.trim()}</span>
          ) : (
            <button
              key={i}
              type="button"
              className={syllableClass(t, selected === i)}
              onClick={() => onSelect(selected === i ? null : i)}
              title={t.source ? SOURCE_LABEL[t.source] : "Carattere non presente nelle tabelle"}
            >
              <span className="text-2xl leading-none">{t.text}</span>
              <span className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                {t.ipa ? t.ipa.replace(/[0-8]$/, "") : "—"}
                {t.tone !== null && <sup>{TONE_SUPERSCRIPT[t.tone]}</sup>}
              </span>
              <span className="text-lg font-semibold" data-testid="ita">{t.ita}</span>
            </button>
          ),
        )}
      </div>

      {current && selected !== null && (
        <AltPanel token={current} onChoose={(alt) => onChooseAlt(selected, alt)} onClose={() => onSelect(null)} />
      )}
    </div>
  );
}

function AltPanel({ token, onChoose, onClose }: { token: Token; onChoose: (alt: SourcedReading) => void; onClose: () => void }) {
  const snippet = token.ipa ? JSON.stringify({ chars: { [token.text]: { ipa: token.ipa, note: "" } } }, null, 2) : null;
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900" data-testid="alts">
      <div className="mb-2 flex items-center justify-between">
        <span>
          <span className="text-xl">{token.text}</span>{" "}
          <span className="text-zinc-500">{token.source ? SOURCE_LABEL[token.source] : "non presente nelle tabelle"}</span>
        </span>
        <button type="button" onClick={onClose} className="px-2 text-zinc-500" aria-label="Chiudi">✕</button>
      </div>
      {token.alts.length === 0 ? (
        <p className="text-zinc-500">Nessuna lettura alternativa.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {token.alts.map((alt) => (
            <li key={`${alt.source}-${alt.ipa}`}>
              <button
                type="button"
                onClick={() => onChoose(alt)}
                className="flex w-full items-baseline gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <span className="w-20 font-semibold">{ipaToItalian(alt.ipa)}</span>
                <span className="w-20 font-mono text-xs text-zinc-500">{alt.ipa}</span>
                <span className="text-xs text-zinc-500">
                  {SOURCE_LABEL[alt.source]}
                  {alt.gloss ? ` · ${alt.gloss}` : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {snippet && (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs text-zinc-500">Snippet per overrides.json</summary>
          <pre className="mt-2 overflow-x-auto rounded-lg bg-zinc-100 p-2 text-xs dark:bg-zinc-800">{snippet}</pre>
          <button
            type="button"
            className="mt-1 text-xs underline"
            onClick={() => navigator.clipboard?.writeText(snippet).catch(() => {})}
          >
            Copia snippet
          </button>
        </details>
      )}
    </div>
  );
}
