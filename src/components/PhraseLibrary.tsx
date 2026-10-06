"use client";

import { useEffect, useMemo, useState } from "react";
import type { DialectId } from "@/lib/dialects";
import { PHRASE_CATEGORIES, PHRASES, transcribePhrase, type Phrase } from "@/lib/phrases";
import { toSimplified } from "@/lib/simplified";
import { Card, Chip, Han } from "./ui";

const ALL = "tutte";

/** Folds accents and case so "perche" finds "Perché". */
const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Browsable ready-made phrases: work without an API key. */
export function PhraseLibrary({ dialect, onPick, selectedId }: { dialect: DialectId; onPick: (phrase: Phrase) => void; selectedId?: string }) {
  const [category, setCategory] = useState(ALL);
  const [query, setQuery] = useState("");
  // Italian spelling per phrase id, in the chosen dialect (its table loads on first use)
  const [spelling, setSpelling] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    void Promise.all(PHRASES.map(async (p) => [p.id, (await transcribePhrase(p, dialect)).ita] as const)).then((pairs) => {
      if (!cancelled) setSpelling(Object.fromEntries(pairs));
    });
    return () => {
      cancelled = true;
    };
  }, [dialect]);

  const rows = useMemo(
    () => PHRASES.map((p) => ({ phrase: p, zh: toSimplified(p.zh), ita: spelling[p.id] ?? "" })),
    [spelling],
  );
  const q = fold(query.trim());
  const visible = rows.filter(
    (r) =>
      (category === ALL || r.phrase.category === category) &&
      (!q || fold(r.phrase.it).includes(q) || fold(r.ita).includes(q) || r.zh.includes(query.trim())),
  );

  return (
    <Card title="Frasi pronte" subtitle="Frasi di tutti i giorni in casa · funzionano senza chiave">
      <div className="flex flex-col gap-4">
        <input
          type="search"
          placeholder="Cerca una frase…"
          aria-label="Cerca una frase"
          className="w-full rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm text-text placeholder:text-muted focus:border-primary focus:bg-surface focus:outline-none"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Categorie">
          {[{ id: ALL, label: "Tutte" }, ...PHRASE_CATEGORIES].map((c) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={category === c.id}
              onClick={() => setCategory(c.id)}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
                category === c.id ? "border-primary bg-primary text-on-primary" : "border-border bg-surface-2 text-text hover:border-primary hover:bg-primary-soft"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {visible.length === 0 ? (
          <p className="text-sm text-muted">Nessuna frase trovata.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border" data-testid="phrase-list">
            {visible.map(({ phrase, zh, ita }) => (
              <li key={phrase.id}>
                <button
                  type="button"
                  onClick={() => onPick(phrase)}
                  aria-current={selectedId === phrase.id}
                  className={`grid w-full grid-cols-[1fr_auto] items-center gap-x-3 gap-y-0.5 px-4 py-3 text-left transition hover:bg-primary-soft ${
                    selectedId === phrase.id ? "bg-primary-soft" : "bg-surface"
                  }`}
                >
                  <span className="font-medium text-text">{phrase.it}</span>
                  <Han className="row-span-2 text-lg text-muted">{zh}</Han>
                  <span className="text-sm font-semibold text-primary">{ita}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-muted">
          Le frasi segnate “da verificare” sono state scritte senza un parlante di Wencheng: possono avere parole del mandarino o di Wenzhou.{" "}
          <Chip tone="warn">da verificare</Chip>
        </p>
      </div>
    </Card>
  );
}
