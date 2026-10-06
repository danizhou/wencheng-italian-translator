# Traduttore Wencheng

Italiano → dialetto di Wencheng (Daxue) o di Qingtian, con la pronuncia scritta "all'italiana". Web app statica (Next.js export) con BYOK: la chiave LLM dell'utente va direttamente dal browser al provider.

Piano e fasi (in inglese): [PLAN.md](./PLAN.md).

## Come si usa

1. Apri il sito, scegli il dialetto (Wencheng o Qingtian) e prova un esempio: funziona anche senza chiave. Cambiando dialetto, la frase già mostrata viene riletta con la pronuncia dell'altro, senza una nuova traduzione.
2. Per tradurre frasi nuove scegli un provider nel riquadro "Chiave API" e inserisci la tua API key:
   - **Anthropic (Claude)**: [console.anthropic.com](https://console.anthropic.com/settings/keys), modello predefinito Claude Haiku 4.5;
   - **OpenAI (GPT)**: [platform.openai.com](https://platform.openai.com/api-keys), modello predefinito GPT-5.4 nano;
   - **xAI (Grok)**: [console.x.ai](https://console.x.ai), modello predefinito Grok 4.7.

   Con "Altro modello…" puoi scrivere a mano l'ID di qualsiasi modello del provider. Tutte e tre le API sono a pagamento a consumo (con i modelli predefiniti, meno di un centesimo per frase); l'app gratuita di Grok non include l'API.
3. Tocca una sillaba per vedere le pronunce alternative e la fonte (per Wencheng: Daxue, Wencheng; per Qingtian: Wenxi, Beishan, Qingtian; per entrambi: Wenzhou).
4. Premi **Ascolta** per sentire la pronuncia letta da una voce vietnamita, con i toni (spunta "Lento" per rallentare). Nel riquadro di una sillaba, l'altoparlante fa lo stesso per la singola sillaba.
5. Premi **Scarica audio** per salvare la pronuncia come file WAV. Il file viene creato nel browser con [Piper](https://github.com/rhasspy/piper) (sintesi vocale open source) e una voce vietnamita: la prima volta il browser scarica la voce (63 MB) da Hugging Face e la tiene in memoria, le volte dopo è immediato. La voce del file è diversa da quella di "Ascolta", che usa la voce del dispositivo e non si può registrare.

Nessuna voce sintetica parla i dialetti di Wencheng o di Qingtian. Il vietnamita è la lingua con le voci già presenti nei telefoni che gli somiglia di più: ha i toni e molti suoni del dialetto (ng-, nh, ư, ơ, đ, gi). Per questo la pronuncia IPA viene riscritta in ortografia vietnamita (per esempio 你 ȵi4 → *nhĩ*, "Hai mangiato?" → *nhĩ và chỉ cụ não*) con le regole di `src/data/vi-rules.json`, e i toni vengono resi con i toni vietnamiti più vicini (con i contorni di Wenzhou per Wencheng, con quelli di Qingtian per Qingtian). Il vietnamita serve solo come voce: non è una traduzione in vietnamita. Resta un'approssimazione. L'audio funziona senza chiave e senza connessione; se manca la voce vietnamita, aggiungila nelle impostazioni di sintesi vocale del telefono o del computer.

Le registrazioni di un parlante sono il passo successivo (vedi `PLAN.md`, §12).

La chiave è salvata solo in locale, nel `localStorage` del tuo browser (una per provider), e va solo all'API di quel provider (`api.anthropic.com`, `api.openai.com` o `api.x.ai`) quando traduci: il sito è statico, non ha un server e non la vede mai. Togliendo la spunta "Salva la chiave su questo dispositivo" resta solo in memoria; "Cancella chiave" la elimina.

Il cinese nel sito è sempre in caratteri semplificati. Le tabelle restano in tradizionale e vengono convertite solo per la visualizzazione (`src/data/simplified.json`, generato con `npm run build:simplified`). 

## Come funziona

1. Il modello traduce la frase italiana nel cinese come si parla nel dialetto scelto (una sola chiamata, più al massimo un nuovo tentativo se usa caratteri che non sono nelle tabelle di quel dialetto).
2. Il testo viene convertito in caratteri tradizionali (opencc).
3. Ogni carattere viene cercato nelle tabelle del dialetto, con priorità:
   - Wencheng: correzioni manuali > Daxue (文成大嶨) > Wencheng (文成) > Wenzhou (溫州)
   - Qingtian: correzioni manuali > Wenxi (青田溫溪) > Beishan (青田北山) > Qingtian (青田) > Wenzhou (溫州)

   Le tabelle di Qingtian segnano la lettura colloquiale (白讀) e quella letteraria (文讀): viene usata per prima la colloquiale.

   Per i caratteri che solo Wenzhou conosce, la pronuncia viene **stimata** dalle corrispondenze regolari tra i due dialetti: si prende la lettura più frequente tra i caratteri che a Wenzhou si leggono allo stesso modo. Nel sito queste sillabe sono tratteggiate ("Stimata da Wenzhou · non verificata"); la lettura di Wenzhou resta tra le alternative. Nelle prove sui caratteri noti la stima dà le lettere giuste circa 3 volte su 4 (Qingtian 77%, Wencheng 70%), contro il 61% e il 40% della lettura di Wenzhou.
4. La pronuncia IPA diventa lettere italiane con le regole di `src/data/ita-rules.json`.

## Correggere una pronuncia

Le correzioni manuali vanno in `src/data/overrides.json`, divise per dialetto (non modificare `wencheng.json` e `qingtian.json`, che sono generati):

```json
{
  "wencheng": {
    "chars":   { "謝": { "ipa": "zi6", "note": "verificato" } },
    "phrases": { "你飯吃過冇": { "ita": "gni va ci cu nau", "note": "frase tipica" } }
  },
  "qingtian": { "chars": {}, "phrases": {} }
}
```

Nel sito, il riquadro delle alternative di ogni sillaba ha uno snippet pronto da copiare. Nelle `phrases` ci vuole una sillaba per ogni carattere. Le chiavi si possono scrivere in semplificato o in tradizionale.

## Dati

`src/data/wencheng.json` e `src/data/qingtian.json` si rigenerano a mano dalle tabelle di [MCPDict](https://github.com/osfans/MCPDict):

```bash
npm run build:data   # scarica le tabelle e scrive wencheng.json e qingtian.json
npm run check:data   # controlla che i file siano validi
```

Il sito carica la tabella di un dialetto solo quando viene usato.

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
