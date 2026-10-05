@AGENTS.md

# Wencheng Translator — project rules
- All code, comments, tests, commit messages and docs are in English. Only README.md is in Italian. User-facing UI text stays in Italian.
- Deterministic pipeline: the only LLM call lives in src/lib/llm. No agent framework.
- The user's API key must NEVER be sent to our server, logged, or stored without consent.
- The IPA → Italian rules live in src/data/ita-rules.json; every change needs a test in tests/ita.test.ts.
- wencheng.json is generated: do not edit it by hand, use overrides.json.
- Source priority: overrides > Daxue (文成大嶨) > Wencheng (文成) > Wenzhou (溫州).
- Traditional characters internally; convert LLM output with opencc s2t.

Full plan and phases: PLAN.md.
