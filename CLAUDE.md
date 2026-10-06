@AGENTS.md

# Wencheng Translator — project rules
- All code, comments, tests, commit messages and docs are in English. Only README.md is in Italian. User-facing UI text stays in Italian.
- Deterministic pipeline: the only LLM call lives in src/lib/llm. No agent framework.
- The user's API key must NEVER be sent to our server or logged. It is saved only locally (localStorage), by default, with a visible notice and an opt-out.
- The IPA → Italian rules live in src/data/ita-rules.json; every change needs a test in tests/ita.test.ts.
- wencheng.json is generated: do not edit it by hand, use overrides.json.
- Source priority: overrides > Daxue (文成大嶨) > Wencheng (文成) > Wenzhou (溫州).
- Traditional characters internally; convert LLM output with opencc s2t.
- Everything shown to the user is simplified Chinese: pass it through toSimplified (src/lib/simplified.ts) and mark it lang="zh-Hans". simplified.json is generated (npm run build:simplified).
- UI uses the design tokens in src/app/globals.css (blue + yellow, Google Sans) and the primitives in src/components/ui.tsx.

Full plan and phases: PLAN.md.
