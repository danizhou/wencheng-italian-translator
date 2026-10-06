"use client";

import { useEffect, useRef, useState } from "react";
import { ApiKeyPanel } from "./ApiKeyPanel";
import { ExampleChips, type Example } from "./ExampleChips";
import { ShareCard } from "./ShareCard";
import { SyllableRow } from "./SyllableRow";
import { CONFIDENCE_LABEL, ERROR_MESSAGE } from "./labels";
import { keyStore } from "@/lib/keyStore";
import { ipaToItalian } from "@/lib/ita";
import { createAnthropicTranslator, DEFAULT_MODEL, findModel, LlmError, translateItalian } from "@/lib/llm";
import type { Translation } from "@/lib/llm/schema";
import type { SourcedReading } from "@/lib/lookup";
import { transcribe } from "@/lib/pipeline";
import { italianLine, type Token } from "@/lib/segment";

interface Result {
  italian: string;
  zh: string;
  tokens: Token[];
  translation: Translation | null;
  retried: boolean;
}

export function Translator() {
  const [apiKey, setApiKey] = useState("");
  const [remember, setRemember] = useState(false);
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [input, setInput] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Restore preferences after hydration (the static HTML has no access to localStorage).
  useEffect(() => {
    const remembered = keyStore.loadRemembered();
    const savedModel = keyStore.loadModel();
    /* eslint-disable react-hooks/set-state-in-effect -- one-time read of browser-only storage */
    if (remembered) {
      setApiKey(remembered);
      setRemember(true);
    }
    if (savedModel) setModel(findModel(savedModel).id);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const updateKey = (key: string) => {
    setApiKey(key);
    if (remember) keyStore.remember(key);
  };
  const updateRemember = (value: boolean) => {
    setRemember(value);
    if (value && apiKey) keyStore.remember(apiKey);
    if (!value) keyStore.forget();
  };
  const clearKey = () => {
    setApiKey("");
    setRemember(false);
    keyStore.forget();
  };
  const updateModel = (id: string) => {
    setModel(id);
    keyStore.saveModel(id);
  };

  const showExample = async (ex: Example) => {
    setInput(ex.it);
    setError(null);
    setSelected(null);
    const t = await transcribe(ex.zh);
    setResult({ italian: ex.it, zh: t.zh, tokens: t.tokens, translation: null, retried: false });
  };

  const translate = async () => {
    const italian = input.trim();
    if (!italian) return;
    setError(null);
    setSelected(null);
    if (!apiKey.trim()) {
      setError(ERROR_MESSAGE.no_key);
      return;
    }
    setLoading(true);
    try {
      const r = await translateItalian(italian, createAnthropicTranslator(apiKey, model));
      setResult({ italian, zh: r.translation.zh, tokens: r.transcription.tokens, translation: r.translation, retried: r.retried });
    } catch (e) {
      setError(e instanceof LlmError ? ERROR_MESSAGE[e.kind] : ERROR_MESSAGE.other);
    } finally {
      setLoading(false);
    }
  };

  const chooseAlt = (index: number, alt: SourcedReading) => {
    if (!result) return;
    const tokens = result.tokens.map((t, i) => {
      if (i !== index || !t.ipa) return t;
      const previous: SourcedReading = { ipa: t.ipa, tone: t.tone ?? 0, source: t.source === "phrase" || !t.source ? "override" : t.source };
      const alts = [previous, ...t.alts.filter((a) => a.ipa !== alt.ipa && a.ipa !== t.ipa)];
      return { ...t, ipa: alt.ipa, tone: alt.tone, ita: ipaToItalian(alt.ipa), source: alt.source, alts };
    });
    setResult({ ...result, tokens });
  };

  const ita = result ? italianLine(result.tokens) : "";

  const copy = async (what: "ita" | "all") => {
    if (!result) return;
    const ipa = result.tokens.filter((t) => t.kind === "han").map((t) => t.ipa ?? "?").join(" ");
    const text = what === "ita" ? ita : `${result.italian}\n${result.zh}\n${ipa}\n${ita}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      setError("Copia non riuscita: seleziona il testo a mano.");
    }
  };

  const exportImage = async () => {
    if (!cardRef.current) return;
    const { toPng } = await import("html-to-image");
    const dataUrl = await toPng(cardRef.current, { pixelRatio: 2 });
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = "wenchenghua.png";
    a.click();
  };

  const wenzhouCount = result?.tokens.filter((t) => t.source === "wenzhou").length ?? 0;
  const missingCount = result?.tokens.filter((t) => t.kind === "han" && t.source === null).length ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <ApiKeyPanel
        apiKey={apiKey}
        onApiKey={updateKey}
        remember={remember}
        onRemember={updateRemember}
        model={model}
        onModel={updateModel}
        onClear={clearKey}
      />

      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          void translate();
        }}
      >
        <textarea
          className="min-h-24 rounded-xl border border-zinc-300 bg-transparent p-3 text-lg dark:border-zinc-700"
          placeholder="Scrivi una frase in italiano…"
          value={input}
          maxLength={300}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void translate();
            }
          }}
        />
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded-xl bg-zinc-900 px-5 py-2.5 font-semibold text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {loading ? "Traduco…" : "Traduci"}
          </button>
          <span className="text-sm text-zinc-500">oppure prova un esempio:</span>
        </div>
        <ExampleChips onPick={(ex) => void showExample(ex)} disabled={loading} />
      </form>

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950/60 dark:text-red-300">
          {error}
        </p>
      )}

      {result && (
        <section className="flex flex-col gap-4 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800" aria-label="Risultato">
          <div className="flex flex-col gap-1">
            <p className="text-sm text-zinc-500">{result.italian}</p>
            <p className="text-3xl font-bold tracking-wide" data-testid="ita-line">{ita}</p>
          </div>

          <SyllableRow tokens={result.tokens} selected={selected} onSelect={setSelected} onChooseAlt={chooseAlt} />

          <div className="flex flex-col gap-1 text-xs text-zinc-500">
            {result.translation && (
              <span>
                Traduzione {CONFIDENCE_LABEL[result.translation.confidence]}
                {result.translation.words.length > 0 && ` · ${result.translation.words.map((w) => `${w.zh} = ${w.it}`).join(", ")}`}
              </span>
            )}
            {result.translation?.note && <span>{result.translation.note}</span>}
            {result.retried && <span>Riscritta una volta per usare caratteri presenti nelle tabelle di Wencheng.</span>}
            {wenzhouCount > 0 && <span className="text-amber-700 dark:text-amber-400">Le sillabe evidenziate vengono dal dialetto di Wenzhou città, non di Wencheng.</span>}
            {missingCount > 0 && <span className="text-red-700 dark:text-red-400">I caratteri in rosso non sono in nessuna tabella.</span>}
            <span>Tocca una sillaba per vedere le pronunce alternative.</span>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void copy("ita")} className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700">
              {copied === "ita" ? "Copiato!" : "Copia"}
            </button>
            <button type="button" onClick={() => void copy("all")} className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700">
              {copied === "all" ? "Copiato!" : "Copia tutto"}
            </button>
            <button type="button" onClick={() => void exportImage()} className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700">
              Esporta immagine
            </button>
          </div>

          {/* Rendered off-screen so html-to-image can capture it */}
          <div aria-hidden className="pointer-events-none fixed -left-[10000px] top-0">
            <ShareCard ref={cardRef} italian={result.italian} tokens={result.tokens} ita={ita} />
          </div>
        </section>
      )}
    </div>
  );
}
