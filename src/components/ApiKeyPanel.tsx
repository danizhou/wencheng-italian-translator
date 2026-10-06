"use client";

import { MODELS } from "@/lib/llm";
import { Button, Card, Chip } from "./ui";

interface Props {
  apiKey: string;
  onApiKey: (key: string) => void;
  save: boolean;
  onSave: (save: boolean) => void;
  model: string;
  onModel: (model: string) => void;
  onClear: () => void;
}

const inputClass = "w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text focus:border-primary focus:outline-none";

export function ApiKeyPanel({ apiKey, onApiKey, save, onSave, model, onModel, onClear }: Props) {
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
          <select className={inputClass} value="anthropic" disabled>
            <option value="anthropic">Anthropic (Claude)</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-muted">Modello</span>
          <select className={inputClass} value={model} onChange={(e) => onModel(e.target.value)}>
            {MODELS.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
          <span className="font-medium text-muted">La tua API key Anthropic</span>
          <input
            type="password"
            autoComplete="off"
            spellCheck={false}
            placeholder="sk-ant-…"
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
          <a className="rounded-full px-3 py-2 text-sm font-medium text-primary hover:bg-primary-soft" href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer">
            Crea una chiave ↗
          </a>
          <Button variant="danger" onClick={onClear} disabled={!hasKey}>Cancella chiave</Button>
        </div>
      </div>

      <p className="mt-4 rounded-xl bg-primary-soft px-4 py-3 text-xs leading-relaxed text-text">
        🔒 <strong>La chiave è salvata solo in locale</strong>, nel tuo browser (<code className="font-mono">localStorage</code>).
        Viene inviata soltanto ad <code className="font-mono">api.anthropic.com</code> quando traduci: questo sito non ha un server e non la vede mai.
        Togli la spunta per tenerla solo in memoria fino alla chiusura della pagina.
      </p>
    </Card>
  );
}
