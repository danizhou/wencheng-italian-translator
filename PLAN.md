# Build plan — Italian → Wenchenghua translator ("Italian-style" pronunciation)

> Initial brief for Claude Code: "Read PLAN.md and implement it phase by phase. Stop at the end of each phase and show me the tests."

## 1. Goal

A (meme) web app where the user types a sentence in **Italian** and gets:

1. the sentence in **Chinese written the way it is spoken in Wenzhou/Wencheng** (traditional characters)
2. the **Wencheng pronunciation** of each character (IPA + tone)
3. the same pronunciation **spelled with Italian letters** (e.g. `gni va ci cu nau`)

Target examples:

| Italian | Chinese | IPA (Daxue) | Italian letters |
|---|---|---|---|
| Hai mangiato? | 你飯吃過冇 | ȵi4 vɑ6 tɕʰi7 ku5 nau4 | gni va ci cu nau |
| Grazie | 謝謝 | zi6 zi6 | zi zi |
| Vado a Milano | 我去米蘭 | ɦŋ̍4 tɕʰy5 meŋ4 lɑ2 | ng ciü meng la |
| Che fai? | 你做甚物 | ȵi4 tɕyu5 zaŋ4 ma8 | gni ciu zang ma |
| Non ho soldi | 我冇錢 | ɦŋ̍4 nau4 dʑie2 | ng nau gie |

**BYOK (bring your own key):** the app has no key of its own. The user enters **their own** API key (Anthropic, optionally OpenAI) in the UI.

## 2. Constraints and architecture

- **Stack:** Next.js (App Router) + TypeScript + Tailwind. No database.
- **No backend for the LLM:** the call goes **from the browser** straight to the provider, so the user's key never passes through our server.
  - Anthropic: `@anthropic-ai/sdk` with `dangerouslyAllowBrowser: true` (adds the `anthropic-dangerous-direct-browser-access` header).
  - OpenAI and xAI (Grok): both speak the Chat Completions API, called with plain `fetch` (only `Authorization` and `Content-Type` headers, to keep CORS preflights minimal) and a strict JSON-schema `response_format`. Defaults: `gpt-5.4-nano`, `grok-4.7`; any model ID can be typed in the UI.
  - The app can therefore be a **static export** (`output: 'export'`) and run on Vercel, Netlify or GitHub Pages.
- **Key handling:**
  - password field and provider/model selector
  - by default the key lives in memory only; a "remember on this device" checkbox → `localStorage` (with try/catch)
  - "clear key" button
  - never log the key and never send it anywhere else; a note in the UI explains where it goes
- **Deterministic pipeline, no LangGraph/agents:** a single LLM call (plus at most 1 validation retry); everything else is plain TypeScript.
- **Model:** configurable in the UI. Default: a small, fast Claude model, checking the current name in the Anthropic docs. Do not hardcode the model in more than one place.

## 3. Data

### 3.1 Source

The **MCPDict / 漢字音典** repo (MIT for the code; the tables are public community collections → credit the source in the footer).

- Repo: `https://github.com/osfans/MCPDict`
- Files (TSV, header `#漢字\t音標\t解釋`, IPA with a trailing numeric tone 1–8):
  - `tools/tables/output/文成大嶨.tsv` — Daxue, Wencheng's county seat, ~4,100 rows, with glosses → **primary source**
  - `tools/tables/output/文成.tsv` — generic Wencheng, ~2,400 rows → **fallback 1**
  - `tools/tables/output/溫州.tsv` — Wenzhou city, ~6,700 rows → **fallback 2** (flagged in the UI as "not Wencheng")
- Format notes:
  - the same character can appear on several rows (multiple readings)
  - `□` marks a syllable with no known character → ignore these in the per-character lookup

### 3.2 Data build script — `scripts/build-data.ts` (or `.py`)

1. Sparse-clone the repo: `git clone --depth 1 --filter=blob:none --no-checkout` + `git checkout HEAD -- <3 files>`. The file names are CJK, so use `git -c core.quotepath=off`.
2. Parse the TSVs → `{ [char]: { readings: [{ ipa, tone, gloss? }], source: 'daxue'|'wencheng'|'wenzhou' } }`.
3. Merge with priority Daxue > Wencheng > Wenzhou: each character keeps the readings of the highest-priority source available; the others go into `alt`.
4. Output: `src/data/wencheng.json`, minified (target < 1 MB), committed to the repo. The script is run by hand only (`npm run build:data`).
5. The script prints stats: characters per source and number of distinct syllables.

### 3.3 "Yuhu" overrides — `src/data/overrides.json`

Manual corrections that win over everything. Added by hand after listening to native speakers.

```json
{
  "chars":   { "謝": { "ipa": "zi6", "note": "verified" } },
  "phrases": { "你飯吃過冇": { "ita": "gni va ci cu nau", "note": "typical phrase" } }
}
```

- `phrases` take priority over the per-character lookup: greedy longest match, left to right.

## 4. Pipeline

```
Italian
  └─(1) LLM → { zh: "你飯吃過冇", gloss: [...], notes }
        └─(2) normalize to traditional (opencc-js, s2t)
              └─(3) coverage check: characters missing from the Wencheng tables?
                    ├─ yes → 1 LLM retry: "rewrite avoiding these characters: …"
                    └─(4) segmentation: phrase override → char override → table lookup
                          └─(5) IPA → Italian letters (rules)
                                └─ output: tokens[{ char, ipa, tone, ita, source, alts[] }]
```

### 4.1 Step 1 — LLM prompt (`src/lib/llm/prompt.ts`)

- **System:**
  - you are a speaker of Wenzhounese/Wenchenghua (Oujiang Wu)
  - translate Italian into Chinese as it is **spoken** in this dialect, not standard Mandarin
  - use the dialect's word order and particles (e.g. 飯吃過冇, not 吃饭了吗; 甚物 for "what"; 冇 for negated possession)
  - use traditional characters
  - short, colloquial sentences
- **Structured output** (tool use / JSON schema):

```ts
{ zh: string;                 // sentence in traditional characters, no Western punctuation
  words: { zh: string; it: string }[];   // word-by-word gloss
  confidence: 'alta'|'media'|'bassa';
  note?: string }
```

- **Coverage retry:** pass the list of missing characters and ask the model to replace them with covered dialect equivalents. Only one retry; after that the result is accepted and the Wenzhou fallback is used.

### 4.2 Step 5 — IPA → Italian letters (`src/lib/ita.ts`)

Pure function `ipaToItalian(ipa: string): string`, table-driven and covered by tests.

1. Strip the tone (trailing digit); the tone is shown separately as an optional superscript.
2. **Initials** (longest match first):

   | IPA | Letters | Note |
   |---|---|---|
   | ɦŋ̍, ʔŋ̍, ŋ̍ | ng | syllabic nasal |
   | tɕʰ, tɕ | c (soft) | ci / cia / ciu |
   | dʑ | g (soft) | gi / gia / gie |
   | ʑ | sg | |
   | ɕ | sci | |
   | tsʰ, ts, dz | z | |
   | pʰ / tʰ / kʰ | p / t / k | aspiration ignored |
   | ȵ | gn | |
   | ɦ | h (silent) | or dropped: configurable |
   | ʔ | (empty) | |
   | ɡ | g (hard) | gh before e/i |
   | k | c (hard) | ch before e/i |

3. **Vowels and finals:**

   | IPA | Letters |
   |---|---|
   | ɔ | o |
   | ɑ | a |
   | ɛ | è |
   | ə | e |
   | ø | eu |
   | yu | iu |
   | y | ü |
   | ŋ | ng |
   | ɿ | (empty: zɿ → "z") |

4. **Italian spelling:** soft c/g before a/o/u/ü → insert `i` (tɕa → "cia"); not needed before e/i. `sci` + i → "sci".
5. **Configuration:** the tables live in `src/data/ita-rules.json`, so they can be tweaked without code changes.

**Required tests** (`ita.test.ts`, Vitest):

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

Plus an end-to-end test that starts from the characters in the §1 table and checks the Italian letters, with the LLM mocked.

### 4.3 Multiple readings

- By default use the first reading of the primary source.
- In the UI every syllable is clickable and shows the alternatives (`alts`) with their source.
- If the user picks an alternative, the result updates (local state) and a JSON snippet can be copied to paste into `overrides.json`.

## 5. UI (single page)

All user-facing text is in Italian.

- **Header:** meme title, subtitle "Italiano → Wenchenghua (Daxue)".
- **API key box (collapsible):**
  - provider: Anthropic / OpenAI
  - model
  - key (password input)
  - "remember on this device"
  - link to the provider console
  - status: key present or missing
- **Input:** Italian textarea + "Traduci" button + 4–6 clickable example sentences. Examples are **precomputed** in `src/data/examples.json`, so they work without a key.
- **Output in 3 rows aligned per syllable:** character / IPA + tone (small) / **Italian letters** (large, copyable). Syllables that came from the Wenzhou fallback are highlighted.
- **Actions:**
  - "Copy" (Italian letters only)
  - "Copy all"
  - "Export image" for social media: PNG card generated client-side with `html-to-image`
- **Footer:** data sources (MCPDict, tables 文成大峃 / 文成 / 溫州) and the disclaimer "approximate pronunciation, Yuhu may differ".
- Mobile-first, dark mode.

## 6. Repo layout

```
/scripts/build-data.ts
/src/app/page.tsx
/src/components/{ApiKeyPanel,Translator,SyllableRow,ExampleChips,ShareCard}.tsx
/src/lib/llm/{index.ts,anthropic.ts,openai.ts,prompt.ts,schema.ts}
/src/lib/{lookup.ts,segment.ts,ita.ts,opencc.ts,keyStore.ts}
/src/data/{wencheng.json,overrides.json,ita-rules.json,examples.json}
/tests/{ita.test.ts,lookup.test.ts,pipeline.test.ts}
CLAUDE.md   ← project rules for Claude Code (see §8)
```

## 7. Phases

Each phase ends with green tests and a demo.

| Phase | Scope | Done when |
|---|---|---|
| **0. Setup** | Next.js + TS + Tailwind + Vitest; `output: 'export'`; CLAUDE.md; `ci.yml` workflow (§10) | `npm run dev` and `npm test` run; the first PR shows a green CI check |
| **1. Data** | `build-data` → `wencheng.json`; `lookup.ts` with priority and `alts` | stats printed; lookup tests on 你 飯 吃 風 錢 做 謝 |
| **2. Italian letters** | `ita.ts` + `ita-rules.json` | all §4.2 cases pass |
| **3. Pipeline without LLM** | input = Chinese characters → output tokens (overrides, segmentation, opencc) | e2e test on the §1 table |
| **4. LLM BYOK** | Anthropic provider (+ OpenAI), structured output, coverage retry, error handling (wrong key, 401, 429, network) | real translation from the browser; the key appears in no request to our domain (check the Network tab) |
| **5. UI** | full page, precomputed examples, clickable alternatives, copy and PNG export | usable on mobile |
| **6. Deploy** | `preview.yml` and `production.yml` workflows (§10); Playwright smoke test on the preview; README with instructions for data, overrides, keys and secrets | every PR gets a comment with the preview URL and a green smoke test; merging to `main` deploys to production |
| **7. Audio** | §12 step 1: browser speech (Web Speech API) reads the Italian letters; "Ascolta" + slow mode + per-syllable play | works without a key or network; e2e test checks the spoken text and voice |

## 8. CLAUDE.md (created in phase 0)

```md
# Wencheng Translator — project rules
- All code, comments, tests, commit messages and docs are in English. Only README.md is in Italian. User-facing UI text stays in Italian.
- Deterministic pipeline: the only LLM call lives in src/lib/llm. No agent framework.
- The user's API key must NEVER be sent to our server, logged, or stored without consent.
- The IPA → Italian rules live in src/data/ita-rules.json; every change needs a test in tests/ita.test.ts.
- wencheng.json is generated: do not edit it by hand, use overrides.json.
- Source priority: overrides > Daxue (文成大嶨) > Wencheng (文成) > Wenzhou (溫州).
- Traditional characters internally; convert LLM output with opencc s2t.
```

## 9. Known risks

- **Step 1 quality:** the LLM tends to write Mandarin. Mitigation: a prompt with dialect examples, example sentences checked by a native speaker and, over time, `phrases` overrides.
- **Coverage:** rare or dialect-only characters (e.g. 幾) are missing from the Wencheng tables. Mitigation: coverage retry, then the highlighted Wenzhou fallback.
- **Yuhu ≠ Daxue:** the data is from the county seat. "Yuhu tuning" goes through `overrides.json`.
- **Data license:** the MCPDict tables are community collections. Credit the source, and check the license before any commercial use.

## 10. CI/CD with GitHub Actions

> **Update:** production hosting is **GitHub Pages**, deployed by `.github/workflows/pages.yml` on every push to `main` (site: `https://danizhou.github.io/wencheng-italian-translator/`). The build gets the `/<repo>` prefix through `PAGES_BASE_PATH` → `basePath` in `next.config.ts`. The Vercel workflows below (per-PR previews and the `production.yml` deploy) are optional and only needed for PR previews.

### Choice

- **Preview hosting:** Vercel, deployed from **GitHub Actions** with the Vercel CLI (`vercel pull` → `vercel build` → `vercel deploy --prebuilt`).
  - Disable the Vercel Git integration's auto-deploy (`vercel.json` → `"git": { "deploymentEnabled": false }`), so only the pipeline deploys.
  - Every PR gets a preview URL and a sticky comment with the link, updated on every push.
  - Rejected alternative: GitHub Pages + pr-preview. Next.js export needs a different `basePath` per PR, which gets fragile.
- **No LLM API key in tests:** unit tests mock the LLM, and the preview smoke test uses the **precomputed examples**, which work without a key.

### Repository secrets

| Secret | Where from |
|---|---|
| `VERCEL_TOKEN` | Vercel → Account Settings → Tokens |
| `VERCEL_ORG_ID` | `.vercel/project.json` after a local `vercel link` |
| `VERCEL_PROJECT_ID` | same as above |

### Workflow 1 — `.github/workflows/ci.yml`

Runs on every push and every PR.

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
      - run: npm test -- --run          # Vitest: ita, lookup, pipeline (LLM mocked)
      - run: npm run check:data         # checks wencheng.json is valid and has > 3000 characters
      - run: npm run build              # next build with output: 'export'
```

### Workflow 2 — `.github/workflows/preview.yml`

Runs on PRs: deploys the preview, comments the URL, runs the smoke test.

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
    if: github.event.pull_request.head.repo.full_name == github.repository   # no secrets for fork PRs
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

Runs on merge to `main` and deploys to production.

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

Runs against `BASE_URL`, with no API key.

1. The home page loads, with the title and the key box visible.
2. Clicking the "Hai mangiato?" example → the syllables `gni va ci cu nau` appear.
3. Clicking a syllable → the alternatives panel opens.
4. "Traduci" without a key → the message "inserisci la tua API key", and no network request to the providers.
5. Security check: no request to the preview domain carries a header or body matching `sk-`.

### Notes

- `vercel.json`: `{ "git": { "deploymentEnabled": false } }`, so there are no double deploys.
- Branch protection on `main`: require the `CI / test` and `Preview / smoke-test` checks.
- Fork PRs get no secrets: only `ci.yml` runs for them. This is intentional.
- Action versions (`@v4`, `@v2`) and the Vercel CLI version must be checked and pinned in phase 6.

## 11. Out of scope (for now)

- Reverse direction (Yuhu dialect → Italian): at most a static glossary of typical phrases.

## 12. Audio

Two different sounds: the **meme sound** (an Italian voice reading "gni va ci cu nau") and the **real sound** (a Wencheng speaker, with tones). No TTS model speaks Wenchenghua, so the real sound needs recordings. Size: 1,040 Wencheng syllables with tone (385 toneless); the 5 examples use 14.

1. **Browser speech — done (phase 7).** No TTS speaks Wenchenghua (Wu models cover Shanghai Wu, not Oujiang Wu), and a Mandarin voice reading the characters sounded wrong, so it was removed.
   - **"Ascolta": Vietnamese voice.** `src/lib/vi.ts` respells the IPA in Vietnamese orthography with the rules in `src/data/vi-rules.json` (initials, the 46 finals in the data matched to the closest valid Vietnamese rhyme, c/k/qu, g/gh, ng/ngh, gi+i spelling, tone-mark placement). Wenzhou tone contours (33, 31, 45ʔ, 34ʔ, 42, 11, 313, 213 — zh.wikipedia 温州话) map to ngang, huyền, sắc, ngã, nặng, huyền, hỏi, hỏi. Daxue's own contours are not in the data; these are an approximation.
   - The Italian voice reading the Italian spelling was removed too: it added nothing over the written spelling.
   - Web Speech API: no key, no network. "Lento" toggle; per-syllable button in the alternatives panel, which also shows the Vietnamese respelling. The UI states it is not a Wencheng speaker.
2. **Recordings by a Yuhu speaker (next, needs a speaker).**
   - In-app "Registra" mode: shows the next syllable (character, IPA, Italian letters), records with MediaRecorder, playback and retake, downloads a zip. Nothing leaves the speaker's device.
   - Order: the 14 example syllables, then verified phrases, then the ~300 most frequent syllables.
   - Files: `public/audio/syllables/<ipa>.mp3`, `public/audio/phrases/<phrase>.mp3`, plus an index JSON.
   - Playback priority: recorded phrase → recorded syllables (crossfaded) → browser speech for the rest; a 🎙️ badge marks real recordings.
3. **Optional:** BYOK cloud TTS for a nicer meme voice; a cloned voice (Qwen3-TTS) only with the speaker's consent and a backend, which this static site does not have.
