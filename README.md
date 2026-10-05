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
