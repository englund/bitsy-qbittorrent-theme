Read `HANDOFF.md` first: it is the project handoff, and its Design principles are hard rules for phones.

Every commit that changes `www/`, `mock-server.mjs` or `icons.mjs` updates `HANDOFF.md` in the same commit (decisions, new tokens, what's left unverified). A separate `docs:` commit later gets skipped when a session ends. `.githooks/pre-commit` enforces this; enable it in a fresh clone with `git config core.hooksPath .githooks`.
