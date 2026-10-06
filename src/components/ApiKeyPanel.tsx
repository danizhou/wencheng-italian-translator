"use client";

import { useState } from "react";
import { modelsFor, PROVIDER_IDS, PROVIDERS, type ProviderId } from "@/lib/llm";
import { Button, Card, Chip } from "./ui";

interface Props {
  provider: ProviderId;
  onProvider: (provider: ProviderId) => void;
  apiKey: string;
  onApiKey: (key: string) => void;
  save: boolean;
  onSave: (save: boolean) => void;
  model: string;
  onModel: (model: string) => void;
  onClear: () => void;
}

const CUSTOM = "__custom__";
const inputClass = "w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text focus:border-primary focus:outline-none";

export function ApiKeyPanel({ provider, onProvider, apiKey, onApiKey, save, onSave, model, onModel, onClear }: Props) {
  const info = PROVIDERS[provider];
  const models = modelsFor(provider);
  const listed = models.some((m) => m.id === model);
  // Custom mode stays open while the user types, even when the field is empty
  const [customFor, setCustomFor] = useState<ProviderId | null>(null);
  const custom = !listed || customFor === provider;
  const hasKey = apiKey.trim().length > 0;

  return (
    <Card
      title="Chiave API"
      subtitle="Serve solo per tradurre frasi nuove"
      actions={<Chip tone={hasKey ? "success" : "neutral"}>{hasKey ? (save ? "Salvata in locale" : "Solo in memoria") : "Nessuna chiave"}</Chip>}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-muted">Provider</span>
          <select
            className={inputClass}
            value={provider}
            onChange={(e) => {
              setCustomFor(null);
              onProvider(e.target.value as ProviderId);
            }}
          >
            {PROVIDER_IDS.map((id) => (
              <option key={id} value={id}>{PROVIDERS[id].label}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-muted">Modello</span>
          <select
            className={inputClass}
            value={custom ? CUSTOM : model}
            onChange={(e) => {
              if (e.target.value === CUSTOM) {
                setCustomFor(provider);
                onModel("");
              } else {
                setCustomFor(null);
                onModel(e.target.value);
              }
            }}
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
            <option value={CUSTOM}>Altro modello…</option>
          </select>
        </label>
        {custom && (
          <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
            <span className="font-medium text-muted">ID del modello ({info.label})</span>
            <input
              className={`${inputClass} font-mono`}
              spellCheck={false}
              placeholder={models[0].id}
              value={model}
              onChange={(e) => onModel(e.target.value)}
            />
          </label>
        )}
        <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
          <span className="font-medium text-muted">La tua API key {info.label}</span>
          <input
            type="password"
            autoComplete="off"
            spellCheck={false}
            placeholder={info.keyPlaceholder}
            className={`${inputClass} font-mono`}
            value={apiKey}
            onChange={(e) => onApiKey(e.target.value)}
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" className="size-4 accent-[var(--primary)]" checked={save} onChange={(e) => onSave(e.target.checked)} />
          Salva la chiave su questo dispositivo
        </label>
        <div className="flex items-center gap-1">
          <a className="rounded-full px-3 py-2 text-sm font-medium text-primary hover:bg-primary-soft" href={info.consoleUrl} target="_blank" rel="noreferrer">
            Crea una chiave ↗
          </a>
          <Button variant="danger" onClick={onClear} disabled={!hasKey}>Cancella chiave</Button>
        </div>
      </div>

      <p className="mt-4 rounded-xl bg-primary-soft px-4 py-3 text-xs leading-relaxed text-text">
        🔒 <strong>La chiave è salvata solo in locale</strong>, nel tuo browser (<code className="font-mono">localStorage</code>), una per provider.
        Viene inviata soltanto ad <code className="font-mono">{info.host}</code> quando traduci: questo sito non ha un server e non la vede mai.
        Togli la spunta per tenerle solo in memoria fino alla chiusura della pagina.
      </p>
    </Card>
  );
}
