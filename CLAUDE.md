@AGENTS.md

# Wencheng Translator — project rules
- All code, comments, tests, commit messages and docs are in English. Only README.md is in Italian. User-facing UI text stays in Italian.
- Deterministic pipeline: the only LLM call lives in src/lib/llm. No agent framework.
- The user's API key must NEVER be sent to our server or logged. It is saved only locally (localStorage), by default, with a visible notice and an opt-out.
- The IPA → Italian rules live in src/data/ita-rules.json; every change needs a test in tests/ita.test.ts.
- The IPA → Vietnamese respelling (read aloud by a Vietnamese voice) lives in src/data/vi-rules.json; every change needs a test in tests/vi.test.ts.
- Two dialects, configured in src/lib/dialects.ts: Wencheng and Qingtian.
- wencheng.json and qingtian.json are generated (npm run build:data): do not edit them by hand, use overrides.json (keyed by dialect).
- Source priority: overrides > Daxue (文成大嶨) > Wencheng (文成) > Wenzhou (溫州) for Wencheng; overrides > Wenxi (青田溫溪) > Beishan (青田北山) > Qingtian (青田) > Wenzhou (溫州) for Qingtian. Characters only Wenzhou has get an "estimated" reading (build-data.ts, estimateFromFallback), flagged in the UI.
- Traditional characters internally; convert LLM output with opencc s2t.
- Everything shown to the user is simplified Chinese: pass it through toSimplified (src/lib/simplified.ts) and mark it lang="zh-Hans". simplified.json is generated (npm run build:simplified).
- UI uses the design tokens in src/app/globals.css (blue + yellow, Google Sans) and the primitives in src/components/ui.tsx.

Full plan and phases: PLAN.md.
