# Piano di build — Traduttore Italiano → Wenchenghua (pronuncia "all'italiana")

> Brief iniziale per Claude Code: "Leggi PLAN-traduttore-wencheng.md e implementalo fase per fase. Fermati alla fine di ogni fase e mostrami i test."

## 1. Obiettivo

Web app (meme) dove l'utente scrive una frase in **italiano** e ottiene:

1. la frase in **cinese scritto come si parla a Wenzhou/Wencheng** (caratteri tradizionali)
2. la **pronuncia di Wencheng** per ogni carattere (IPA + tono)
3. la stessa pronuncia **scritta con lettere italiane** (es. `gni va ci cu nau`)

Esempio target:

| Italiano | Cinese | IPA (Daxue) | Lettere italiane |
|---|---|---|---|
| Hai mangiato? | 你飯吃過冇 | ȵi4 vɑ6 tɕʰi7 ku5 nau4 | gni va ci cu nau |
| Grazie | 謝謝 | zi6 zi6 | zi zi |
| Vado a Milano | 我去米蘭 | ɦŋ̍4 tɕʰy5 meŋ4 lɑ2 | ng ciü meng la |
| Che fai? | 你做甚物 | ȵi4 tɕyu5 zaŋ4 ma8 | gni ciu zang ma |
| Non ho soldi | 我冇錢 | ɦŋ̍4 nau4 dʑie2 | ng nau gie |

**BYOK (bring your own key):** l'app non ha una chiave propria. L'utente inserisce la **sua** API key (Anthropic, opzionalmente OpenAI) nella UI.

## 2. Vincoli e scelte architetturali

- **Stack:** Next.js (App Router) + TypeScript + Tailwind. Nessun database.
- **Nessun backend per l'LLM:** la chiamata parte **dal browser** direttamente al provider, così la chiave dell'utente non passa mai dal nostro server.
  - Anthropic: SDK `@anthropic-ai/sdk` con `dangerouslyAllowBrowser: true` (aggiunge l'header `anthropic-dangerous-direct-browser-access`).
  - OpenAI (opzionale): SDK `openai` con `dangerouslyAllowBrowser: true`.
  - L'app può quindi essere **export statico** (`output: 'export'`) e girare su Vercel, Netlify o GitHub Pages.
- **Gestione chiave:**
  - campo password e selettore provider/modello
  - di default la chiave sta solo in memoria; checkbox "ricorda su questo dispositivo" → `localStorage` (con try/catch)
  - pulsante "cancella chiave"
  - mai loggare la chiave e mai inviarla altrove; una nota in UI spiega dove va
- **Pipeline deterministica, niente LangGraph/agent:** una sola chiamata LLM (più al massimo 1 retry di validazione), il resto è TypeScript puro.
- **Modello:** configurabile in UI. Default: un modello Claude piccolo e veloce, verificando il nome corrente nella documentazione Anthropic. Non hardcodare il modello in più punti.

## 3. Dati

### 3.1 Sorgente

Repo **MCPDict / 漢字音典** (MIT per il codice; le tabelle sono raccolte pubbliche della comunità → citare la fonte nel footer).

- Repo: `https://github.com/osfans/MCPDict`
- File (formato TSV, header `#漢字\t音標\t解釋`, IPA con tono numerico finale 1–8):
  - `tools/tables/output/文成大嶨.tsv` — Daxue, capoluogo di Wencheng, ~4.100 righe, con glosse → **fonte primaria**
  - `tools/tables/output/文成.tsv` — Wencheng generico, ~2.400 righe → **fallback 1**
  - `tools/tables/output/溫州.tsv` — Wenzhou città, ~6.700 righe → **fallback 2** (marcato in UI come "non Wencheng")
- Note sul formato:
  - lo stesso carattere può comparire su più righe (più letture)
  - `□` indica una sillaba senza carattere noto → ignorarle nel lookup per carattere

### 3.2 Script di build dati — `scripts/build-data.ts` (o `.py`)

1. Clona il repo in modo sparso: `git clone --depth 1 --filter=blob:none --no-checkout` + `git checkout HEAD -- <3 file>`. Nota: nomi dei file in CJK, usare `git -c core.quotepath=off`.
2. Parsing TSV → struttura `{ [char]: { readings: [{ ipa, tone, gloss? }], source: 'daxue'|'wencheng'|'wenzhou' } }`.
3. Merge con priorità Daxue > Wencheng > Wenzhou: per ogni carattere si tengono le letture della fonte più prioritaria disponibile, le altre finiscono in `alt`.
4. Output: `src/data/wencheng.json`, minificato (target < 1 MB), committato nel repo. Lo script si lancia solo a mano (`npm run build:data`).
5. Lo script stampa statistiche: numero di caratteri per fonte e numero di sillabe distinte.

### 3.3 Override "Yuhu" — `src/data/overrides.json`

Correzioni manuali che vincono su tutto. Si aggiungono a mano dopo aver sentito chi parla il dialetto.

```json
{
  "chars":   { "謝": { "ipa": "zi6", "note": "verificato" } },
  "phrases": { "你飯吃過冇": { "ita": "gni va ci cu nau", "note": "frase tipica" } }
}
```

- Le `phrases` hanno priorità sul lookup carattere per carattere: match greedy del più lungo, da sinistra a destra.

## 4. Pipeline

```
italiano
  └─(1) LLM → { zh: "你飯吃過冇", gloss: [...], notes }
        └─(2) normalizza a tradizionale (opencc-js, s2t)
              └─(3) validazione copertura: caratteri assenti dalle tabelle Wencheng?
                    ├─ sì → 1 retry LLM: "riscrivi evitando questi caratteri: …"
                    └─(4) segmentazione: phrase override → char override → lookup tabelle
                          └─(5) IPA → lettere italiane (regole)
                                └─ output: tokens[{ char, ipa, tone, ita, source, alts[] }]
```

### 4.1 Passo 1 — prompt LLM (`src/lib/llm/prompt.ts`)

- **System:**
  - sei un parlante di wenzhounese/wenchenghua (Wu dell'Oujiang)
  - traduci l'italiano nel cinese come si **parla** in questo dialetto, non in mandarino standard
  - usa l'ordine delle parole e le particelle del dialetto (es. 飯吃過冇 e non 吃饭了吗; 甚物 per "cosa"; 冇 per la negazione di possesso)
  - usa caratteri tradizionali
  - frasi brevi e colloquiali
- **Output strutturato** (tool use / JSON schema):

```ts
{ zh: string;                 // frase in caratteri tradizionali, senza punteggiatura occidentale
  words: { zh: string; it: string }[];   // glossa parola per parola
  confidence: 'alta'|'media'|'bassa';
  note?: string }
```

- **Retry di copertura:** si passa la lista dei caratteri mancanti e si chiede di sostituirli con equivalenti dialettali coperti. Il retry è uno solo, poi si accetta il risultato e si usa il fallback Wenzhou.

### 4.2 Passo 5 — IPA → lettere italiane (`src/lib/ita.ts`)

Funzione pura `ipaToItalian(ipa: string): string`, guidata da tabelle e coperta da test.

1. Rimuovi il tono (cifra finale); il tono si mostra a parte come apice opzionale.
2. **Iniziali** (match del più lungo prima):

   | IPA | Lettere | Nota |
   |---|---|---|
   | ɦŋ̍, ʔŋ̍, ŋ̍ | ng | nasale sillabica |
   | tɕʰ, tɕ | c (dolce) | ci / cia / ciu |
   | dʑ | g (dolce) | gi / gia / gie |
   | ʑ | sg | |
   | ɕ | sci | |
   | tsʰ, ts, dz | z | |
   | pʰ / tʰ / kʰ | p / t / k | aspirazione ignorata |
   | ȵ | gn | |
   | ɦ | h (muta) | o rimuovere: scelta in config |
   | ʔ | (vuoto) | |
   | ɡ | g (dura) | gh davanti a e/i |
   | k | c (dura) | ch davanti a e/i |

3. **Vocali e finali:**

   | IPA | Lettere |
   |---|---|
   | ɔ | o |
   | ɑ | a |
   | ɛ | è |
   | ə | e |
   | ø | eu |
   | yu | iu |
   | y | ü |
   | ŋ | ng |
   | ɿ | (vuoto: zɿ → "z") |

4. **Ortografia italiana:** c/g dolci davanti ad a/o/u/ü → si inserisce `i` (tɕa → "cia"); davanti a e/i non serve. `sci` + i → "sc".
5. **Configurazione:** le tabelle stanno in `src/data/ita-rules.json`, così si possono ritoccare senza cambiare codice.

**Test obbligatori** (`ita.test.ts`, Vitest):

| Input | Output |
|---|---|
| ȵi4 | gni |
| vɑ6 | va |
| tɕʰi7 | ci |
| ku5 | cu |
| nau4 | nau |
| zi6 | zi |
| ɦŋ̍4 | ng |
| tɕʰy5 | ciü |
| meŋ4 | meng |
| lɑ2 | la |
| tɕyu5 | ciu |
| zaŋ4 | zang |
| ma8 | ma |
| dʑie2 | gie |
| foŋ1 | fong |
| kʰe5 | che |
| ɡi2 | ghi |

Più un test end-to-end che parte dai caratteri della tabella del §1 e verifica le lettere italiane, con l'LLM mockato.

### 4.3 Letture multiple

- Di default si usa la prima lettura della fonte primaria.
- In UI ogni sillaba è cliccabile e mostra le alternative (`alts`) con la fonte.
- Se l'utente sceglie un'alternativa, il risultato si aggiorna (stato locale) e si può copiare uno snippet JSON da incollare in `overrides.json`.

## 5. UI (una pagina)

- **Header:** titolo meme, sottotitolo "Italiano → Wenchenghua (Daxue)".
- **Box chiave API (collassabile):**
  - provider: Anthropic / OpenAI
  - modello
  - chiave (input password)
  - "ricorda su questo dispositivo"
  - link alla console del provider
  - stato: chiave presente o assente
- **Input:** textarea italiano + bottone "Traduci" + 4–6 frasi d'esempio cliccabili. Gli esempi sono **precalcolati** in `src/data/examples.json`, così funzionano anche senza chiave.
- **Output a 3 righe allineate per sillaba:** carattere / IPA+tono (piccolo) / **lettere italiane** (grande, copiabile). Le sillabe venute dal fallback Wenzhou vanno evidenziate.
- **Azioni:**
  - "Copia" (solo lettere italiane)
  - "Copia tutto"
  - "Esporta immagine" per i social: card PNG generata client-side con `html-to-image`
- **Footer:** fonti dei dati (MCPDict, tabelle 文成大峃 / 文成 / 溫州) e il disclaimer "pronuncia approssimata, Yuhu può differire".
- Mobile-first, dark mode.

## 6. Struttura del repo

```
/scripts/build-data.ts
/src/app/page.tsx
/src/components/{ApiKeyPanel,Translator,SyllableRow,ExampleChips,ShareCard}.tsx
/src/lib/llm/{index.ts,anthropic.ts,openai.ts,prompt.ts,schema.ts}
/src/lib/{lookup.ts,segment.ts,ita.ts,opencc.ts,keyStore.ts}
/src/data/{wencheng.json,overrides.json,ita-rules.json,examples.json}
/tests/{ita.test.ts,lookup.test.ts,pipeline.test.ts}
CLAUDE.md   ← regole del progetto per Claude Code (vedi §8)
```

## 7. Fasi

Ogni fase si chiude con i test verdi e una demo.

| Fase | Contenuto | Done quando |
|---|---|---|
| **0. Setup** | Next.js + TS + Tailwind + Vitest; `output: 'export'`; CLAUDE.md; workflow `ci.yml` (§10) | `npm run dev` e `npm test` girano; la prima PR mostra il check CI verde |
| **1. Dati** | `build-data` → `wencheng.json`; `lookup.ts` con priorità e `alts` | statistiche stampate; test lookup su 你 飯 吃 風 錢 做 謝 |
| **2. Lettere italiane** | `ita.ts` + `ita-rules.json` | tutti i casi del §4.2 passano |
| **3. Pipeline senza LLM** | input = caratteri cinesi → output tokens (override, segmentazione, opencc) | test e2e sulla tabella del §1 |
| **4. LLM BYOK** | provider Anthropic (+ OpenAI), output strutturato, retry di copertura, gestione errori (chiave errata, 401, 429, rete) | traduzione reale da browser; la chiave non compare in nessuna request verso il nostro dominio (verifica nel tab Network) |
| **5. UI** | pagina completa, esempi precalcolati, alternative cliccabili, copia ed export PNG | usabile da mobile |
| **6. Deploy** | workflow `preview.yml` e `production.yml` (§10); smoke test Playwright sulla preview; README con istruzioni dati, override, chiavi e secrets | ogni PR riceve un commento con l'URL di preview e lo smoke test è verde; il merge su `main` va in produzione |

## 8. CLAUDE.md (da creare nella fase 0)

```md
# Traduttore Wencheng — regole di progetto
- Pipeline deterministica: l'unica chiamata LLM è in src/lib/llm. Niente agent framework.
- La API key dell'utente non deve MAI essere inviata al nostro server, loggata o salvata senza consenso.
- Le regole IPA→italiano vivono in src/data/ita-rules.json; ogni modifica richiede un test in tests/ita.test.ts.
- wencheng.json è generato: non modificarlo a mano, usa overrides.json.
- Priorità fonti: overrides > Daxue (文成大嶨) > Wencheng (文成) > Wenzhou (溫州).
- Caratteri tradizionali internamente; converti l'output LLM con opencc s2t.
```

## 9. Rischi noti

- **Qualità del passo 1:** l'LLM tende a scrivere mandarino. Mitigazione: prompt con esempi dialettali, frasi d'esempio verificate da un parlante e, nel tempo, le `phrases` in override.
- **Copertura:** i caratteri rari o solo dialettali (es. 幾) mancano nelle tabelle di Wencheng. Mitigazione: retry di copertura, poi fallback Wenzhou evidenziato.
- **Yuhu ≠ Daxue:** i dati sono del capoluogo. La "taratura Yuhu" passa da `overrides.json`.
- **Licenza dati:** le tabelle MCPDict sono raccolte comunitarie. Va citata la fonte, e per un uso commerciale bisogna verificarne la licenza.

## 10. CI/CD con GitHub Actions

### Scelta

- **Hosting delle preview:** Vercel, deployato da **GitHub Actions** con la Vercel CLI (`vercel pull` → `vercel build` → `vercel deploy --prebuilt`).
  - Si disattiva l'auto-deploy dell'integrazione Git di Vercel (`vercel.json` → `"git": { "deploymentEnabled": false }`), così deploya solo la pipeline.
  - Ogni PR ottiene un URL di preview e un commento sticky con il link, aggiornato a ogni push.
  - Alternativa scartata: GitHub Pages + pr-preview. Con l'export di Next.js serve un `basePath` diverso per ogni PR, e diventa fragile.
- **Nessuna API key LLM nei test:** gli unit test mockano l'LLM, e lo smoke test sulla preview usa gli **esempi precalcolati**, che funzionano senza chiave.

### Secrets del repository

| Secret | Da dove |
|---|---|
| `VERCEL_TOKEN` | Vercel → Account Settings → Tokens |
| `VERCEL_ORG_ID` | `.vercel/project.json` dopo un `vercel link` locale |
| `VERCEL_PROJECT_ID` | come sopra |

### Workflow 1 — `.github/workflows/ci.yml`

Gira su ogni push e su ogni PR.

```yaml
name: CI
on:
  pull_request:
  push:
    branches: [main]
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm run lint
      - run: npx tsc --noEmit
      - run: npm test -- --run          # Vitest: ita, lookup, pipeline (LLM mockato)
      - run: npm run check:data         # verifica che wencheng.json sia valido e > 3000 caratteri
      - run: npm run build              # next build con output: 'export'
```

### Workflow 2 — `.github/workflows/preview.yml`

Gira sulle PR: deploy della preview, commento con l'URL e smoke test.

```yaml
name: Preview
on:
  pull_request:
    types: [opened, synchronize, reopened]
concurrency:
  group: preview-${{ github.event.pull_request.number }}
  cancel-in-progress: true
permissions:
  contents: read
  pull-requests: write
env:
  VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
  VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
jobs:
  deploy-preview:
    if: github.event.pull_request.head.repo.full_name == github.repository   # niente secrets alle PR da fork
    runs-on: ubuntu-latest
    outputs:
      url: ${{ steps.deploy.outputs.url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm test -- --run
      - run: npx vercel pull --yes --environment=preview --token=${{ secrets.VERCEL_TOKEN }}
      - run: npx vercel build --token=${{ secrets.VERCEL_TOKEN }}
      - id: deploy
        run: echo "url=$(npx vercel deploy --prebuilt --token=${{ secrets.VERCEL_TOKEN }})" >> "$GITHUB_OUTPUT"
      - uses: marocchino/sticky-pull-request-comment@v2
        with:
          header: preview
          message: |
            🔎 **Preview:** ${{ steps.deploy.outputs.url }}
            Commit: ${{ github.event.pull_request.head.sha }}

  smoke-test:
    needs: deploy-preview
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npx playwright test tests/e2e
        env:
          BASE_URL: ${{ needs.deploy-preview.outputs.url }}
      - if: failure()
        uses: actions/upload-artifact@v4
        with: { name: playwright-report, path: playwright-report }
```

### Workflow 3 — `.github/workflows/production.yml`

Gira al merge su `main` e manda in produzione.

```yaml
name: Production
on:
  push:
    branches: [main]
concurrency:
  group: production
  cancel-in-progress: false
env:
  VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
  VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm test -- --run
      - run: npx vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}
      - run: npx vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}
      - run: npx vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }}
```

### Smoke test — `tests/e2e/smoke.spec.ts` (Playwright)

Gira contro `BASE_URL`, senza nessuna API key.

1. La home si carica, con titolo e box della chiave visibili.
2. Click sull'esempio "Hai mangiato?" → compaiono le sillabe `gni va ci cu nau`.
3. Click su una sillaba → si apre il pannello delle alternative.
4. "Traduci" senza chiave → messaggio "inserisci la tua API key", nessuna request di rete verso i provider.
5. Controllo di sicurezza: nessuna request verso il dominio della preview contiene header o body con pattern `sk-`.

### Note

- `vercel.json`: `{ "git": { "deploymentEnabled": false } }`, così non ci sono deploy doppi.
- Branch protection su `main`: richiedere i check `CI / test` e `Preview / smoke-test`.
- Le PR da fork non ricevono secrets: per loro gira solo `ci.yml`. È voluto.
- Le versioni delle action (`@v4`, `@v2`) e della Vercel CLI vanno controllate e fissate alla fase 6.

## 11. Fuori scope (per ora)

- Audio/TTS. Possibili step successivi: (a) Qwen3-TTS con voce clonata (con consenso) che legge le lettere italiane; (b) banca di sillabe registrate da un parlante e concatenate.
- Direzione inversa (yuhunese → italiano): al massimo un glossario statico delle frasi tipiche.
