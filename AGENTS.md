# Repository Guidelines

## Project Structure & Module Organization

- App code lives in `app/` (`routes`, `components`, `lib`, `types`, `welcome`, `root.tsx`).
- Tests live in `tests/unit`, `tests/e2e`, and `tests/mocks`; prefer mirroring the `app/` folder structure.
- Static assets are in `public/`; global styles are in `app/app.css`.
- Architecture, API, and auth docs are in `docs/` and `ガイド/` (see especially `docs/02_環境変数設定.md`).

## Build, Test, and Development Commands

- `npm run dev` — start the React Router dev server.
- `npm run build` — build client and server bundles.
- `npm start` — run the built server (`./build/server/index.js`).
- `npm run typecheck` — generate types and run `tsc`.
- `npm test` / `npm run test:ui` — run Vitest unit tests (CLI / UI).
- `npm run test:e2e` / `npm run test:e2e:ui` — run Playwright end-to-end tests.

## Coding Style & Naming Conventions

- Use TypeScript, React function components, and React Router loaders/actions where appropriate.
- Follow existing formatting (2-space indent, double quotes, trailing commas); let your editor format code, but do not introduce new style tools.
- Use `PascalCase` for components, `camelCase` for variables/functions, and keep route filenames consistent with existing patterns (e.g., `routes/chat.tsx`, `routes/api.chat-stream.ts`).
- Prefer the `~` alias for imports from `app/` (e.g., `~/lib/...`).

## Testing Guidelines

- Write unit tests with Vitest in `tests/unit`, using `*.test.ts` / `*.test.tsx` and mirroring the source path (see `tests/unit/routes/chat-action.test.ts`).
- Keep tests isolated with `vi.mock` for external services and network calls.
- Add or update Playwright specs in `tests/e2e` when changing auth or user flows.
- Run `npm test` and `npm run test:e2e` before opening a pull request when relevant.

## Commit & Pull Request Guidelines

- Use short, imperative commit messages similar to the existing history (e.g., `Add chat-stream tests and conversation store`).
- For pull requests, include: a concise summary, linked issues or spec docs (`docs/` / `ガイド/`), how to reproduce and test, and screenshots or GIFs for UI changes.
- Note any configuration or environment variable changes and update `docs/02_環境変数設定.md` or related docs accordingly.
