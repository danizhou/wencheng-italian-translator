@AGENTS.md

# Traduttore Wencheng — regole di progetto
- Pipeline deterministica: l'unica chiamata LLM è in src/lib/llm. Niente agent framework.
- La API key dell'utente non deve MAI essere inviata al nostro server, loggata o salvata senza consenso.
- Le regole IPA→italiano vivono in src/data/ita-rules.json; ogni modifica richiede un test in tests/ita.test.ts.
- wencheng.json è generato: non modificarlo a mano, usa overrides.json.
- Priorità fonti: overrides > Daxue (文成大嶨) > Wencheng (文成) > Wenzhou (溫州).
- Caratteri tradizionali internamente; converti l'output LLM con opencc s2t.

Piano completo e fasi: PLAN-traduttore-wencheng.md.
