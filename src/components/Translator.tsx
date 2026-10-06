"use client";

import { useEffect, useRef, useState } from "react";
import { ApiKeyPanel } from "./ApiKeyPanel";
import { ExampleChips, type Example } from "./ExampleChips";
import { ShareCard } from "./ShareCard";
import { SpeakButton, SpeechNotice } from "./SpeakButton";
import { SyllableRow } from "./SyllableRow";
import { CONFIDENCE, ERROR_MESSAGE } from "./labels";
import { Button, Card, Chip, Han } from "./ui";
import { keyStore } from "@/lib/keyStore";
import { ipaToItalian } from "@/lib/ita";
import { createAnthropicTranslator, DEFAULT_MODEL, findModel, LlmError, translateItalian } from "@/lib/llm";
import type { Translation } from "@/lib/llm/schema";
import type { SourcedReading } from "@/lib/lookup";
import { transcribe } from "@/lib/pipeline";
import { italianLine, type Token } from "@/lib/segment";
import { toSimplified } from "@/lib/simplified";

interface Result {
  italian: string;
  /** Traditional, as used internally; shown through toSimplified */
  zh: string;
  tokens: Token[];
  translation: Translation | null;
  retried: boolean;
}

export function Translator() {
  const [apiKey, setApiKey] = useState("");
  const [save, setSave] = useState(true);
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [input, setInput] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [slow, setSlow] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Restore preferences after hydration (the static HTML has no access to localStorage).
  useEffect(() => {
    const saved = keyStore.loadSaved();
    const savedModel = keyStore.loadModel();
    const saveEnabled = keyStore.loadSaveEnabled();
    /* eslint-disable react-hooks/set-state-in-effect -- one-time read of browser-only storage */
    setSave(saveEnabled);
    if (saved && saveEnabled) setApiKey(saved);
    if (savedModel) setModel(findModel(savedModel).id);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const updateKey = (key: string) => {
    setApiKey(key);
    if (save) keyStore.save(key);
  };
  const updateSave = (value: boolean) => {
    setSave(value);
    keyStore.setSaveEnabled(value);
    if (value) keyStore.save(apiKey);
    else keyStore.forget();
  };
  const clearKey = () => {
    setApiKey("");
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
  const zhShown = result ? toSimplified(result.zh) : "";

  const copy = async (what: "ita" | "all") => {
    if (!result) return;
    const ipa = result.tokens.filter((t) => t.kind === "han").map((t) => t.ipa ?? "?").join(" ");
    const text = what === "ita" ? ita : `${result.italian}\n${zhShown}\n${ipa}\n${ita}`;
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
      <Card title="Traduci" subtitle="Scrivi in italiano: ottieni il dialetto di Wencheng e come si pronuncia">
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void translate();
          }}
        >
          <textarea
            className="min-h-28 w-full resize-y rounded-xl border border-border bg-surface-2 p-4 text-lg text-text placeholder:text-muted focus:border-primary focus:bg-surface focus:outline-none"
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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-muted">Invio per tradurre · Maiusc+Invio per andare a capo</span>
            <Button type="submit" variant="primary" disabled={loading || !input.trim()} className="px-6 py-2.5 text-base">
              {loading ? "Traduco…" : "Traduci"}
            </Button>
          </div>
          <div className="flex flex-col gap-2 border-t border-border pt-4">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">Esempi · funzionano senza chiave</span>
            <ExampleChips onPick={(ex) => void showExample(ex)} disabled={loading} />
          </div>
        </form>
      </Card>

      {error && (
        <p role="alert" className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      {result && (
        <Card
          aria-label="Risultato"
          title={result.italian}
          subtitle={<Han className="text-base">{zhShown}</Han>}
          actions={result.translation ? <Chip tone={CONFIDENCE[result.translation.confidence].tone}>{CONFIDENCE[result.translation.confidence].label}</Chip> : <Chip tone="primary">Esempio</Chip>}
        >
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl bg-accent-soft px-4 py-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-on-accent/70 dark:text-accent/80">Pronuncia</p>
                <p className="mt-1 text-3xl font-bold tracking-wide text-on-accent dark:text-accent" data-testid="ita-line">{ita}</p>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs font-medium text-on-accent/80 dark:text-accent/80">
                  <input type="checkbox" className="size-3.5 accent-[var(--primary)]" checked={slow} onChange={(e) => setSlow(e.target.checked)} />
                  Lento
                </label>
                <SpeakButton text={ita} slow={slow} />
              </div>
            </div>

            <SyllableRow tokens={result.tokens} selected={selected} onSelect={setSelected} onChooseAlt={chooseAlt} />

            {result.translation && result.translation.words.length > 0 && (
              <dl className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                {result.translation.words.map((w, i) => (
                  <div key={i} className="flex gap-1.5">
                    <dt><Han className="font-medium">{toSimplified(w.zh)}</Han></dt>
                    <dd className="text-muted">{w.it}</dd>
                  </div>
                ))}
              </dl>
            )}

            <ul className="flex flex-col gap-1 text-xs text-muted">
              {result.translation?.note && <li>{toSimplified(result.translation.note)}</li>}
              {result.retried && <li>Riscritta una volta per usare caratteri presenti nelle tabelle di Wencheng.</li>}
              {wenzhouCount > 0 && <li className="text-warn">Le sillabe evidenziate vengono dal dialetto di Wenzhou città, non di Wencheng.</li>}
              {missingCount > 0 && <li className="text-danger">I caratteri in rosso non sono in nessuna tabella.</li>}
              <li>Tocca una sillaba per vedere le pronunce alternative.</li>
              <li>L&apos;audio è una voce italiana che legge le lettere: non è la voce di un parlante di Wencheng.</li>
              <SpeechNotice />
            </ul>

            <div className="flex flex-wrap gap-2 border-t border-border pt-4">
              <Button variant="primary" onClick={() => void copy("ita")}>{copied === "ita" ? "Copiato!" : "Copia"}</Button>
              <Button onClick={() => void copy("all")}>{copied === "all" ? "Copiato!" : "Copia tutto"}</Button>
              <Button onClick={() => void exportImage()}>Esporta immagine</Button>
            </div>
          </div>

          {/* Rendered off-screen so html-to-image can capture it */}
          <div aria-hidden className="pointer-events-none fixed -left-[10000px] top-0">
            <ShareCard ref={cardRef} italian={result.italian} tokens={result.tokens} ita={ita} />
          </div>
        </Card>
      )}

      <ApiKeyPanel
        apiKey={apiKey}
        onApiKey={updateKey}
        save={save}
        onSave={updateSave}
        model={model}
        onModel={updateModel}
        onClear={clearKey}
      />
    </div>
  );
}
