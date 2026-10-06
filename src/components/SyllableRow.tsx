"use client";

import type { Token } from "@/lib/segment";
import type { SourcedReading } from "@/lib/lookup";
import { ipaToItalian } from "@/lib/ita";
import { toSimplified } from "@/lib/simplified";
import { SOURCE_LABEL } from "./labels";
import { SpeakButton } from "./SpeakButton";
import { Button, Chip, Han } from "./ui";

interface Props {
  tokens: Token[];
  selected: number | null;
  onSelect: (index: number | null) => void;
  onChooseAlt: (index: number, alt: SourcedReading) => void;
}

const TONE_SUPERSCRIPT = "⁰¹²³⁴⁵⁶⁷⁸";

function syllableClass(t: Token, isSelected: boolean) {
  const base = "group flex min-w-14 flex-col items-center gap-1 rounded-xl border px-2 py-2 transition";
  const state =
    t.source === null ? "border-danger/40 bg-danger-soft text-danger"
    : t.source === "wenzhou" ? "border-warn/50 bg-warn-soft"
    : "border-transparent hover:border-border hover:bg-surface-2";
  return `${base} ${state} ${isSelected ? "!border-primary bg-primary-soft" : ""}`;
}

export function SyllableRow({ tokens, selected, onSelect, onChooseAlt }: Props) {
  const current = selected !== null ? tokens[selected] : null;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-1.5" data-testid="syllables">
        {tokens.map((t, i) =>
          t.kind === "other" ? (
            <span key={i} className="self-end pb-3 text-2xl text-muted">{toSimplified(t.ita.trim())}</span>
          ) : (
            <button
              key={i}
              type="button"
              className={syllableClass(t, selected === i)}
              onClick={() => onSelect(selected === i ? null : i)}
              title={t.source ? SOURCE_LABEL[t.source] : "Carattere non presente nelle tabelle"}
              aria-pressed={selected === i}
            >
              <Han className="text-3xl leading-none">{toSimplified(t.text)}</Han>
              <span className="font-mono text-[11px] text-muted">
                {t.ipa ? t.ipa.replace(/[0-8]$/, "") : "—"}
                {t.tone !== null && <sup>{TONE_SUPERSCRIPT[t.tone]}</sup>}
              </span>
              <span className="text-lg font-semibold text-primary" data-testid="ita">{t.ita}</span>
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
  const char = toSimplified(token.text);
  const snippet = token.ipa ? JSON.stringify({ chars: { [char]: { ipa: token.ipa, note: "" } } }, null, 2) : null;
  return (
    <div className="rounded-xl border border-border bg-surface-2 p-4 text-sm" data-testid="alts">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Han className="text-2xl">{char}</Han>
          <Chip tone={token.source === "wenzhou" ? "warn" : token.source ? "primary" : "danger"}>
            {token.source ? SOURCE_LABEL[token.source] : "Non presente nelle tabelle"}
          </Chip>
        </div>
        <div className="flex items-center gap-1">
          <SpeakButton text={char} lang="zh" slow variant="compact" tag="中" label="Ascolta il carattere" />
          <SpeakButton text={token.ita} lang="it" slow variant="compact" tag="IT" label="Ascolta le lettere" />
          <Button variant="ghost" onClick={onClose} aria-label="Chiudi">✕</Button>
        </div>
      </div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Pronunce alternative</p>
      {token.alts.length === 0 ? (
        <p className="text-muted">Nessuna lettura alternativa.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
          {token.alts.map((alt) => (
            <li key={`${alt.source}-${alt.ipa}`}>
              <button
                type="button"
                onClick={() => onChoose(alt)}
                className="grid w-full grid-cols-[5rem_5rem_1fr] items-baseline gap-2 px-3 py-2 text-left hover:bg-primary-soft"
              >
                <span className="font-semibold text-primary">{ipaToItalian(alt.ipa)}</span>
                <span className="font-mono text-xs text-muted">{alt.ipa}</span>
                <span className="text-xs text-muted">
                  {SOURCE_LABEL[alt.source]}
                  {alt.gloss ? <> · <Han>{toSimplified(alt.gloss)}</Han></> : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {snippet && (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs text-muted">Snippet per overrides.json</summary>
          <pre lang="zh-Hans" className="mt-2 overflow-x-auto rounded-lg bg-surface p-3 font-mono text-xs">{snippet}</pre>
          <Button variant="ghost" className="mt-1 !px-2 !py-1 text-xs" onClick={() => navigator.clipboard?.writeText(snippet).catch(() => {})}>
            Copia snippet
          </Button>
        </details>
      )}
    </div>
  );
}
