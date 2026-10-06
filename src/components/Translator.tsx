"use client";

import { useEffect, useRef, useState } from "react";
import { ApiKeyPanel } from "./ApiKeyPanel";
import { ShareCard } from "./ShareCard";
import { PhraseLibrary } from "./PhraseLibrary";
import { SpeakButton, SpeechNotice } from "./SpeakButton";
import { SyllableRow } from "./SyllableRow";
import { CONFIDENCE, ERROR_MESSAGE } from "./labels";
import { Button, Card, Chip, Han } from "./ui";
import { keyStore } from "@/lib/keyStore";
import {
  createTranslator,
  DEFAULT_MODEL,
  DEFAULT_PROVIDER,
  defaultModelFor,
  isProvider,
  LlmError,
  PROVIDER_IDS,
  translateItalian,
  type ProviderId,
} from "@/lib/llm";
import type { Translation } from "@/lib/llm/schema";
import type { SourcedReading } from "@/lib/lookup";
import { transcribePhrase, withReading, type Phrase } from "@/lib/phrases";
import { italianLine, type Token } from "@/lib/segment";
import { toSimplified } from "@/lib/simplified";
import { vietnameseLine } from "@/lib/vi";

interface Result {
  italian: string;
  /** Traditional, as used internally; shown through toSimplified */
  zh: string;
  tokens: Token[];
  translation: Translation | null;
  retried: boolean;
  /** Set when the result is a ready-made phrase */
  phrase?: Phrase;
}

export function Translator() {
  const [provider, setProvider] = useState<ProviderId>(DEFAULT_PROVIDER);
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

  /** Key and model of a provider, from this device's storage */
  const loadProvider = (p: ProviderId, saveEnabled: boolean) => {
    setProvider(p);
    setApiKey(saveEnabled ? (keyStore.loadSaved(p) ?? "") : "");
    setModel(keyStore.loadModel(p) ?? defaultModelFor(p));
  };

  // Restore preferences after hydration (the static HTML has no access to localStorage).
  useEffect(() => {
    const saveEnabled = keyStore.loadSaveEnabled();
    const savedProvider = keyStore.loadProvider();
    /* eslint-disable react-hooks/set-state-in-effect -- one-time read of browser-only storage */
    setSave(saveEnabled);
    loadProvider(isProvider(savedProvider) ? savedProvider : DEFAULT_PROVIDER, saveEnabled);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const updateProvider = (p: ProviderId) => {
    keyStore.saveProvider(p);
    setError(null);
    loadProvider(p, save);
  };
  const updateKey = (key: string) => {
    setApiKey(key);
    if (save) keyStore.save(provider, key);
  };
  const updateSave = (value: boolean) => {
    setSave(value);
    keyStore.setSaveEnabled(value);
    if (value) keyStore.save(provider, apiKey);
    else keyStore.forgetAll(PROVIDER_IDS);
  };
  const clearKey = () => {
    setApiKey("");
    keyStore.forget(provider);
  };
  const updateModel = (id: string) => {
    setModel(id);
    if (id.trim()) keyStore.saveModel(provider, id.trim());
  };

  const resultRef = useRef<HTMLDivElement>(null);
  const showPhrase = (phrase: Phrase) => {
    setInput(phrase.it);
    setError(null);
    setSelected(null);
    setResult({ italian: phrase.it, zh: phrase.zh, tokens: transcribePhrase(phrase).tokens, translation: null, retried: false, phrase });
    requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
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
    if (!model.trim()) {
      setError("Scrivi l'ID del modello da usare.");
      return;
    }
    setLoading(true);
    try {
      const r = await translateItalian(italian, createTranslator(provider, apiKey, model));
      setResult({ italian, zh: r.translation.zh, tokens: r.transcription.tokens, translation: r.translation, retried: r.retried });
    } catch (e) {
      setError(e instanceof LlmError ? ERROR_MESSAGE[e.kind] : ERROR_MESSAGE.other);
    } finally {
      setLoading(false);
    }
  };

  const chooseAlt = (index: number, alt: SourcedReading) => {
    if (!result) return;
    setResult({ ...result, tokens: result.tokens.map((t, i) => (i === index ? withReading(t, alt.ipa) : t)) });
  };

  const ita = result ? italianLine(result.tokens) : "";
  const zhShown = result ? toSimplified(result.zh) : "";
  const viLine = result ? vietnameseLine(result.tokens) : "";

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
        </form>
      </Card>

      {error && (
        <p role="alert" className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      <div ref={resultRef} className="scroll-mt-4" />
      {result && (
        <Card
          aria-label="Risultato"
          title={result.italian}
          subtitle={<Han className="text-base">{zhShown}</Han>}
          actions={
            result.translation ? (
              <Chip tone={CONFIDENCE[result.translation.confidence].tone}>{CONFIDENCE[result.translation.confidence].label}</Chip>
            ) : result.phrase?.verified ? (
              <Chip tone="primary">Frase pronta</Chip>
            ) : (
              <Chip tone="warn">Da verificare</Chip>
            )
          }
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
                <SpeakButton text={viLine} slow={slow} label="Ascolta" />
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
              <li>“Ascolta” usa una voce vietnamita che legge la pronuncia con i toni: il vietnamita ha molti suoni e toni simili al dialetto, ma resta un&apos;approssimazione, non un parlante di Wencheng.</li>
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

      <PhraseLibrary onPick={showPhrase} selectedId={result?.phrase?.id} />

      <ApiKeyPanel
        provider={provider}
        onProvider={updateProvider}
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
