---
name: env-check
description: Verify local environment configuration (Dify, Entra ID, session secrets) for this repo. Use when setting up a dev environment, debugging auth/Dify connection issues, or before a production deploy.
---

Run the repo's env-verification scripts and summarize the results for the user, in this order:

1. `bash check-dify-config.sh` — validates `DIFY_API_URL` (must include `/v1`) and `DIFY_API_KEY` (must start with `app-`) from `.env`.
2. `bash scripts/dev-check.sh` — broader dev-environment check: confirms `.env` exists and all required vars are set (`NODE_ENV`, `PORT`, `ENTRA_CLIENT_ID`, `ENTRA_CLIENT_SECRET`, `ENTRA_TENANT_ID`, `ENTRA_REDIRECT_URI`, `DIFY_API_URL`, `DIFY_API_KEY`, `SESSION_SECRET`).
3. If checking for a production deploy (or the user mentions "production"/"prod"), also run `NODE_ENV=production npx tsx scripts/check-production-env.ts` — this enforces stricter rules (HTTPS-only redirect URIs, UUID-format Entra IDs, `app-`-prefixed Dify key, 32+ char session secret).

Report each script's pass/fail output plainly. Do not print the actual values of `.env` secrets (API keys, client secrets, session secret) back to the user — only whether each check passed or failed, and which specific var is missing/malformed if a check fails.
