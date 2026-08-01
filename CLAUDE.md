説明・確認・作業報告は原則として日本語で行ってください。コード、コマンド、ファイル名、Gitのコミットメッセージは必要に応じて英語のままにしてください。複雑な判断では理由と注意点も簡潔に説明してください。
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project purpose

This is an internal RAG search chatbot (社内 RAG 検索チャットボット): a React Router frontend that authenticates users via Microsoft Entra ID, then streams chat responses from a separately-hosted Dify backend (`DIFY_API_URL`/`DIFY_API_KEY`). Microsoft Graph API (`app/lib/graph`) is used for group/department-based access checks (`GRAPH_DEPARTMENT_GROUP_PREFIX`). The Dify backend itself lives outside this repo — `ちゃっとのお試し.yml` is only a Dify DSL export used to verify the chat API contract, not app source.

## Things to know that aren't obvious from the code

- **No formatter is configured** (no Prettier/Biome config — ESLint was added later, see below), and AGENTS.md explicitly says not to introduce new style tools — follow the existing 2-space/double-quote/trailing-comma convention by hand, don't add more tooling unless asked.
- **Never read or print the contents of `.env`** — it holds real Entra/Dify secrets, not example values.
- ~38 historical AI-generated status/report files (`COMPLETE_ACHIEVEMENT_REPORT.md`, `FINAL_SUMMARY.md`, `TEST_STATUS.md`, etc.) and Japanese-named progress notes were archived from the repo root into `docs/archive/`. These are stale snapshots, not living docs — don't create new ones at the root; real docs live in `docs/` and `ガイド/`.
- The two Dockerfiles pin different Node patch versions (root `Dockerfile`: `node:24.14-alpine`, `.devcontainer/Dockerfile`: `node:24.18.0-bookworm`) — both track Node 24, but keep this in mind if a build-vs-devcontainer discrepancy shows up.
- The devcontainer's `docker-compose.yml` joins an external `docker_default` network aliased `dify_network` and sets `AUTH_MODE=dev` — it expects a locally-running Dify stack alongside it for full end-to-end testing.
- Commit messages mix English and Japanese, sometimes with `feat:`/`fix:` prefixes — match whatever style the surrounding recent commits use rather than forcing one language.
- `test-dify-api.ts`, `test-dify-api-direct.ts`, and `test-graph-api.ts` at the root are standalone manual verification scripts, not part of the Vitest suite (`npm test` doesn't run them).
- ESLint (`npm run lint`, flat config in `eslint.config.js`) was added on top of the pre-existing convention-only style — it currently has ~32 pre-existing errors (mostly `@typescript-eslint/no-explicit-any` in test files and the standalone API scripts) and ~35 warnings left as a backlog; don't feel obligated to fix unrelated ones while working on something else, but don't add new ones either.
- **Japanese filenames/dirs under `ガイド/` are NFD-normalized** (decomposed combining characters, e.g. macOS-style), while normally-typed Japanese text is NFC-composed. A `git add`/`git mv`/etc. with a normally-typed path silently matches nothing (no error) since git's pathspec matching is byte-exact. Use `git add -A` (or `git add .`) instead of naming these paths directly, and double-check `git status` after any add involving `ガイド/` files.
- **The unit test suite has a known, pre-existing Vitest/Vite-plugin issue**: any test file that imports a module containing JSX fails to even collect, with `Error: React Router Vite plugin can't detect preamble` — this is unrelated to the test's own logic and affects many component/route test files (e.g. `card.test.tsx`, `avatar.test.tsx`, `settings.test.tsx`). Confirmed present since before any dependency bumps, likely a `vite.config.ts` test-config/`@react-router/dev` Vite-plugin interaction problem, not something introduced by a specific change. `npm test` currently reports roughly 19 failing test files / 16 failing individual tests out of 32-36 files — check whether a failure is this same root cause before assuming your change broke something.
