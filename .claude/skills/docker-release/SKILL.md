---
name: docker-release
description: Build and push a Docker image for this app via scripts/docker-build-push.sh. User-triggered only — has side effects (pushes to Docker Hub).
disable-model-invocation: true
---

Run `scripts/docker-build-push.sh` to build (and by default push) the app's Docker image.

Usage: `$ARGUMENTS` maps to the script's own flags:
- `--arch <arm64|amd64>` — required. Accepts shorthand `arm`/`x64` too.
- `--tag TAG` — defaults to `latest`.
- `--no-push` — build only, skip the push.

Pushing requires `DOCKERHUB_IMAGE` to be set in the environment (e.g. `myuser/rag-chat-app`) — the script errors out if it's missing and `--no-push` wasn't passed. Confirm the target image/tag with the user before running with push enabled, since this publishes to Docker Hub.

Example: `bash scripts/docker-build-push.sh --arch amd64 --tag v1.0.0`
