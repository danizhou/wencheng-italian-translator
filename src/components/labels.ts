import type { TokenSource } from "@/lib/segment";
import type { LlmErrorKind } from "@/lib/llm";

/** User-facing UI text (Italian). */
export const SOURCE_LABEL: Record<TokenSource, string> = {
  daxue: "Daxue (文成大嶨)",
  wencheng: "Wencheng (文成)",
  wenzhou: "Wenzhou (溫州) — non Wencheng",
  override: "Correzione manuale",
  phrase: "Frase verificata",
};

export const ERROR_MESSAGE: Record<LlmErrorKind, string> = {
  no_key: "Inserisci la tua API key per tradurre frasi nuove. Gli esempi funzionano anche senza.",
  auth: "La API key non è valida o non ha accesso a questo modello. Controllala nella console Anthropic.",
  rate_limit: "Troppe richieste o credito esaurito sul tuo account. Riprova tra poco.",
  overloaded: "Il servizio è sovraccarico in questo momento. Riprova tra qualche secondo.",
  network: "Errore di rete: controlla la connessione e riprova.",
  refusal: "Il modello non ha voluto tradurre questa frase. Prova a riformularla.",
  bad_output: "Il modello ha risposto in un formato inatteso. Riprova.",
  other: "Qualcosa è andato storto. Riprova.",
};

export const CONFIDENCE_LABEL = { alta: "sicura", media: "plausibile", bassa: "incerta" } as const;
