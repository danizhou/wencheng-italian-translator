"use client";

import { useEffect, useRef, useState } from "react";
import { ApiKeyPanel } from "./ApiKeyPanel";
import { DialectPicker } from "./DialectPicker";
import { ExampleChips, type Example } from "./ExampleChips";
import { ShareCard } from "./ShareCard";
import { SpeakButton, SpeechNotice } from "./SpeakButton";
import { SyllableRow } from "./SyllableRow";
import { CONFIDENCE, ERROR_MESSAGE } from "./labels";
import { Button, Card, Chip, Han } from "./ui";
import { DEFAULT_DIALECT, ESTIMATED_SOURCE, FALLBACK_SOURCE, findDialect, type DialectId } from "@/lib/dialects";
import { keyStore } from "@/lib/keyStore";
import { ipaToItalian } from "@/lib/ita";
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
import { transcribe } from "@/lib/pipeline";
import { italianLine, type Token } from "@/lib/segment";
import { toSimplified } from "@/lib/simplified";
import { vietnameseLine } from "@/lib/vi";
import { audioFileName, isVoiceStored, saveBlob, synthesizeVietnamese, VOICE_SIZE_MB, type AudioStage } from "@/lib/audioFile";

interface Result {
  italian: string;
  /** Traditional, as used internally; shown through toSimplified */
  zh: string;
  tokens: Token[];
  /** Dialect the tokens are read in */
  dialect: DialectId;
  translation: Translation | null;
  /** Dialect the LLM translated into; null for the precomputed examples */
  translatedFor: DialectId | null;
  retried: boolean;
}

export function Translator() {
  const [provider, setProvider] = useState<ProviderId>(DEFAULT_PROVIDER);
  const [apiKey, setApiKey] = useState("");
  const [save, setSave] = useState(true);
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [dialectId, setDialectId] = useState<DialectId>(DEFAULT_DIALECT);
  const [input, setInput] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [slow, setSlow] = useState(false);
  const [audio, setAudio] = useState<AudioStage | null>(null);
  const [voiceStored, setVoiceStored] = useState(true);
  const cardRef = useRef<HTMLDivElement>(null);
  const dialect = findDialect(dialectId);

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
    const savedDialect = keyStore.loadDialect();
    /* eslint-disable react-hooks/set-state-in-effect -- one-time read of browser-only storage */
    setSave(saveEnabled);
    loadProvider(isProvider(savedProvider) ? savedProvider : DEFAULT_PROVIDER, saveEnabled);
    if (savedDialect) setDialectId(findDialect(savedDialect).id);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const hasResult = result !== null;
  useEffect(() => {
    if (!hasResult) return;
    let cancelled = false;
    void isVoiceStored().then((stored) => {
      if (!cancelled) setVoiceStored(stored);
    });
    return () => {
      cancelled = true;
    };
  }, [hasResult]);

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

  /** Reads the current sentence again with the other dialect's tables; no new LLM call. */
  const updateDialect = async (id: DialectId) => {
    setDialectId(id);
    keyStore.saveDialect(id);
    setSelected(null);
    if (!result) return;
    const t = await transcribe(result.zh, id);
    setResult({ ...result, tokens: t.tokens, dialect: id });
  };

  const showExample = async (ex: Example) => {
    setInput(ex.it);
    setError(null);
    setSelected(null);
    const t = await transcribe(ex.zh, dialectId);
    setResult({ italian: ex.it, zh: t.zh, tokens: t.tokens, dialect: dialectId, translation: null, translatedFor: null, retried: false });
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
      const r = await translateItalian(italian, createTranslator(provider, apiKey, model), dialectId);
      setResult({ italian, zh: r.translation.zh, tokens: r.transcription.tokens, dialect: dialectId, translation: r.translation, translatedFor: dialectId, retried: r.retried });
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
  const viLine = result ? vietnameseLine(result.tokens, result.dialect) : "";

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
    a.download = `${dialect.id}hua.png`;
    a.click();
  };

  const downloadAudio = async () => {
    if (!result || audio) return;
    setError(null);
    try {
      const wav = await synthesizeVietnamese(vietnameseLine(result.tokens, result.dialect), setAudio);
      saveBlob(wav, audioFileName(result.italian));
      setVoiceStored(true);
    } catch {
      setError("Non sono riuscito a creare l'audio: controlla la connessione (la prima volta serve scaricare la voce) e riprova.");
    } finally {
      setAudio(null);
    }
  };

  const audioLabel =
    audio?.stage === "voice" ? `Scarico la voce… ${Math.round(audio.fraction * 100)}%`
    : audio?.stage === "audio" ? "Creo l'audio…"
    : "Scarica audio";

  const wenzhouCount = result?.tokens.filter((t) => t.source === FALLBACK_SOURCE).length ?? 0;
  const estimatedCount = result?.tokens.filter((t) => t.source === ESTIMATED_SOURCE).length ?? 0;
  const missingCount = result?.tokens.filter((t) => t.kind === "han" && t.source === null).length ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <Card title="Traduci" subtitle={`Scrivi in italiano: ottieni il dialetto di ${dialect.name} e come si pronuncia`}>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void translate();
          }}
        >
          <DialectPicker value={dialectId} onChange={(id) => void updateDialect(id)} disabled={loading} />
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
                <SpeakButton text={viLine} slow={slow} label="Ascolta" />
              </div>
            </div>

            <SyllableRow tokens={result.tokens} dialect={result.dialect} selected={selected} onSelect={setSelected} onChooseAlt={chooseAlt} />

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
              {result.translatedFor && result.translatedFor !== result.dialect && (
                <li className="text-warn">
                  Frase tradotta per il dialetto di {findDialect(result.translatedFor).name}, letta con la pronuncia di {dialect.name}: premi Traduci per tradurla in {dialect.name}.
                </li>
              )}
              {result.retried && <li>Riscritta una volta per usare caratteri presenti nelle tabelle di {findDialect(result.translatedFor ?? dialectId).name}.</li>}
              {estimatedCount > 0 && <li className="text-warn">Le sillabe tratteggiate non sono nelle tabelle di {dialect.name}: la pronuncia è stimata da quella di Wenzhou città.</li>}
              {wenzhouCount > 0 && <li className="text-warn">Le sillabe evidenziate vengono dal dialetto di Wenzhou città, non di {dialect.name}.</li>}
              {missingCount > 0 && <li className="text-danger">I caratteri in rosso non sono in nessuna tabella.</li>}
              <li>Tocca una sillaba per vedere le pronunce alternative.</li>
              <li>“Ascolta” usa una voce vietnamita che legge la pronuncia con i toni: il vietnamita ha molti suoni e toni simili al dialetto, ma resta un&apos;approssimazione, non un parlante di {dialect.name}.</li>
              <SpeechNotice />
            </ul>

            <div className="flex flex-wrap gap-2 border-t border-border pt-4">
              <Button variant="primary" onClick={() => void copy("ita")}>{copied === "ita" ? "Copiato!" : "Copia"}</Button>
              <Button onClick={() => void copy("all")}>{copied === "all" ? "Copiato!" : "Copia tutto"}</Button>
              <Button onClick={() => void exportImage()}>Esporta immagine</Button>
              <Button onClick={() => void downloadAudio()} disabled={audio !== null || !viLine} aria-live="polite">
                {audioLabel}
              </Button>
            </div>
            {!voiceStored && (
              <p className="-mt-2 text-xs text-muted">
                “Scarica audio” crea un file WAV con una voce vietnamita. La prima volta scarica la voce ({VOICE_SIZE_MB} MB), poi resta salvata nel browser.
              </p>
            )}
          </div>

          {/* Rendered off-screen so html-to-image can capture it */}
          <div aria-hidden className="pointer-events-none fixed -left-[10000px] top-0">
            <ShareCard ref={cardRef} italian={result.italian} tokens={result.tokens} ita={ita} dialect={dialect} />
          </div>
        </Card>
      )}

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
