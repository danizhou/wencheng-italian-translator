# Traduttore Wencheng

Italiano → Wenchenghua (Daxue), con la pronuncia scritta "all'italiana". Web app statica (Next.js export) con BYOK: la chiave LLM dell'utente va direttamente dal browser al provider.

Piano e fasi (in inglese): [PLAN.md](./PLAN.md).

## Sviluppo

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # Vitest (watch); in CI: npm test -- --run
npm run lint
npm run build      # export statico in out/
```

## Pubblicazione su GitHub Pages

Il sito è pubblicato su **https://danizhou.github.io/wencheng-italian-traslator/** dal workflow `.github/workflows/pages.yml`, a ogni push su `main` (oppure a mano da Actions → Pages → Run workflow).

Configurazione una tantum: nel repo vai su **Settings → Pages → Build and deployment → Source** e scegli **GitHub Actions**.

Per provare in locale la build con il prefisso di Pages:

```bash
PAGES_BASE_PATH=/wencheng-italian-traslator npm run build
```
