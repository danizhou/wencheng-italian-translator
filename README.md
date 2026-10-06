# Traduttore Wencheng

Italiano → Wenchenghua (Daxue), con la pronuncia scritta "all'italiana". Web app statica (Next.js export) con BYOK: la chiave LLM dell'utente va direttamente dal browser al provider.

Piano e fasi (in inglese): [PLAN.md](./PLAN.md).

## Come si usa

1. Apri il sito e scegli una delle **frasi pronte**: una ventina di frasi di tutti i giorni in casa (a tavola, in casa, uscire e rientrare, il tempo, soldi e spesa, risposte veloci). Puoi cercarle o filtrarle per categoria e funzionano anche senza chiave. Le frasi segnate "da verificare" sono state scritte senza un parlante di Wencheng: correggile in `src/data/phrases.json` quando le senti dire da qualcuno.
2. Per tradurre frasi nuove scegli un provider nel riquadro "Chiave API" e inserisci la tua API key:
   - **Anthropic (Claude)**: [console.anthropic.com](https://console.anthropic.com/settings/keys), modello predefinito Claude Haiku 4.5;
   - **OpenAI (GPT)**: [platform.openai.com](https://platform.openai.com/api-keys), modello predefinito GPT-5.4 nano;
   - **xAI (Grok)**: [console.x.ai](https://console.x.ai), modello predefinito Grok 4.7.

   Con "Altro modello…" puoi scrivere a mano l'ID di qualsiasi modello del provider. Tutte e tre le API sono a pagamento a consumo (con i modelli predefiniti, meno di un centesimo per frase); l'app gratuita di Grok non include l'API.
3. Tocca una sillaba per vedere le pronunce alternative e la fonte (Daxue, Wencheng o Wenzhou).
4. Premi **Ascolta** per sentire la pronuncia letta da una voce vietnamita, con i toni (spunta "Lento" per rallentare). Nel riquadro di una sillaba, l'altoparlante fa lo stesso per la singola sillaba.

Nessuna voce sintetica parla il dialetto di Wencheng. Il vietnamita è la lingua con le voci già presenti nei telefoni che gli somiglia di più: ha i toni e molti suoni del dialetto (ng-, nh, ư, ơ, đ, gi). Per questo la pronuncia IPA viene riscritta in ortografia vietnamita (per esempio 你 ȵi4 → *nhĩ*, "Hai mangiato?" → *nhĩ và chỉ cụ não*) con le regole di `src/data/vi-rules.json`, e i toni di Wenzhou vengono resi con i toni vietnamiti più vicini. Resta un'approssimazione. L'audio funziona senza chiave e senza connessione; se manca la voce vietnamita, aggiungila nelle impostazioni di sintesi vocale del telefono o del computer.

Le registrazioni di un parlante sono il passo successivo (vedi `PLAN.md`, §12).

La chiave è salvata solo in locale, nel `localStorage` del tuo browser (una per provider), e va solo all'API di quel provider (`api.anthropic.com`, `api.openai.com` o `api.x.ai`) quando traduci: il sito è statico, non ha un server e non la vede mai. Togliendo la spunta "Salva la chiave su questo dispositivo" resta solo in memoria; "Cancella chiave" la elimina.

Il cinese nel sito è sempre in caratteri semplificati. Le tabelle restano in tradizionale e vengono convertite solo per la visualizzazione (`src/data/simplified.json`, generato con `npm run build:simplified`). 

## Come funziona

1. Il modello traduce la frase italiana nel cinese come si parla a Wenzhou/Wencheng (una sola chiamata, più al massimo un nuovo tentativo se usa caratteri che non sono nelle tabelle di Wencheng).
2. Il testo viene convertito in caratteri tradizionali (opencc).
3. Ogni carattere viene cercato nelle tabelle, con priorità: correzioni manuali > Daxue (文成大嶨) > Wencheng (文成) > Wenzhou (溫州).
4. La pronuncia IPA diventa lettere italiane con le regole di `src/data/ita-rules.json`.

## Correggere una pronuncia

Le correzioni manuali vanno in `src/data/overrides.json` (non modificare `wencheng.json`, che è generato):

```json
{
  "chars":   { "謝": { "ipa": "zi6", "note": "verificato" } },
  "phrases": { "你飯吃過冇": { "ita": "gni va ci cu nau", "note": "frase tipica" } }
}
```

Nel sito, il riquadro delle alternative di ogni sillaba ha uno snippet pronto da copiare. Nelle `phrases` ci vuole una sillaba per ogni carattere. Le chiavi si possono scrivere in semplificato o in tradizionale.

## Dati

`src/data/wencheng.json` si rigenera a mano dalle tabelle di [MCPDict](https://github.com/osfans/MCPDict):

```bash
npm run build:data   # scarica le tabelle e scrive wencheng.json
npm run check:data   # controlla che il file sia valido
```

## Sviluppo

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # Vitest (watch); in CI: npm test -- --run
npm run lint
npm run build      # export statico in out/
npm run test:e2e   # smoke test Playwright sulla build in out/
```

## Pubblicazione su GitHub Pages

Il sito è pubblicato su **https://danizhou.github.io/wencheng-italian-translator/** dal workflow `.github/workflows/pages.yml`, a ogni push su `main` (oppure a mano da Actions → Pages → Run workflow).

Configurazione una tantum: nel repo vai su **Settings → Pages → Build and deployment → Source** e scegli **GitHub Actions**.

Per provare in locale la build con il prefisso di Pages:

```bash
PAGES_BASE_PATH=/wencheng-italian-translator npm run build
```
