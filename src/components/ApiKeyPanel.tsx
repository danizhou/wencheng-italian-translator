"use client";

import { MODELS } from "@/lib/llm";

interface Props {
  apiKey: string;
  onApiKey: (key: string) => void;
  remember: boolean;
  onRemember: (remember: boolean) => void;
  model: string;
  onModel: (model: string) => void;
  onClear: () => void;
}

export function ApiKeyPanel({ apiKey, onApiKey, remember, onRemember, model, onModel, onClear }: Props) {
  const hasKey = apiKey.trim().length > 0;
  return (
    <details className="group rounded-xl border border-zinc-200 bg-white/60 dark:border-zinc-800 dark:bg-zinc-900/60" open={!hasKey}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-medium">
        <span>Chiave API</span>
        <span className={`rounded-full px-2 py-0.5 text-xs ${hasKey ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"}`}>
          {hasKey ? "chiave presente" : "nessuna chiave"}
        </span>
      </summary>
      <div className="flex flex-col gap-3 border-t border-zinc-200 px-4 py-4 text-sm dark:border-zinc-800">
        <label className="flex flex-col gap-1">
          <span className="text-zinc-600 dark:text-zinc-400">Provider</span>
          <select className="rounded-lg border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700" value="anthropic" disabled>
            <option value="anthropic">Anthropic (Claude)</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-zinc-600 dark:text-zinc-400">Modello</span>
          <select
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            value={model}
            onChange={(e) => onModel(e.target.value)}
          >
            {MODELS.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-zinc-600 dark:text-zinc-400">La tua API key Anthropic</span>
          <input
            type="password"
            autoComplete="off"
            spellCheck={false}
            placeholder="sk-ant-…"
            className="rounded-lg border border-zinc-300 bg-transparent px-3 py-2 font-mono dark:border-zinc-700"
            value={apiKey}
            onChange={(e) => onApiKey(e.target.value)}
          />
        </label>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={remember} onChange={(e) => onRemember(e.target.checked)} />
            Ricorda su questo dispositivo
          </label>
          <button type="button" onClick={onClear} className="rounded-lg px-3 py-1.5 text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950">
            Cancella chiave
          </button>
        </div>
        <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
          La chiave va solo dal tuo browser ad <code>api.anthropic.com</code>: questo sito non ha un server e non la vede mai.
          Di default resta in memoria e sparisce quando chiudi la pagina; con “Ricorda” viene salvata solo in questo browser.
          Puoi crearne una su{" "}
          <a className="underline" href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer">console.anthropic.com</a>.
        </p>
      </div>
    </details>
  );
}
