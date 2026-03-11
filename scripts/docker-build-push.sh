#!/bin/bash
# Docker イメージをビルドし、Docker Hub へプッシュするスクリプト
# 使用方法: ./scripts/docker-build-push.sh --arch <arm64|amd64> [--tag TAG] [--no-push]
# 環境変数: DOCKERHUB_IMAGE (例: myuser/rag-chat-app) … プッシュ時に必須

set -e

RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Docker または Podman が使えるか確認
if command -v docker &>/dev/null; then
  DOCKER_CMD=docker
elif command -v podman &>/dev/null; then
  DOCKER_CMD=podman
else
  echo -e "${RED}Error: docker または podman が見つかりません。${NC}" >&2
  echo "" >&2
  echo "インストール例:" >&2
  echo "  Ubuntu/Debian:  sudo apt update && sudo apt install -y docker.io" >&2
  echo "  macOS (OrbStack): OrbStack を起動すると docker が使えます" >&2
  echo "  macOS (Docker Desktop): https://docs.docker.com/desktop/install/mac-install/" >&2
  echo "  Linux 公式:     https://docs.docker.com/engine/install/" >&2
  exit 1
fi

GREEN='\033[0;32m'

usage() {
  echo "Usage: $0 --arch <arm64|amd64> [OPTIONS]"
  echo ""
  echo "Architecture (--arch):"
  echo "  arm64    ARM64 (Apple Silicon, AWS Graviton 等)"
  echo "  amd64    x86_64 (Intel/AMD)"
  echo "  arm      arm64 の省略形"
  echo "  x64      amd64 の省略形"
  echo ""
  echo "Options:"
  echo "  --tag TAG    イメージタグ (default: latest)"
  echo "  --no-push    ビルドのみ行い、プッシュしない"
  echo "  -h, --help   このヘルプを表示"
  echo ""
  echo "Environment:"
  echo "  DOCKERHUB_IMAGE  プッシュ先イメージ名 (例: myuser/rag-chat-app)。--no-push の場合は不要。"
  echo ""
  echo "Example:"
  echo "  DOCKERHUB_IMAGE=myuser/rag-chat-app $0 --arch amd64 --tag v1.0.0"
  echo "  $0 --arch arm64 --no-push"
  exit 0
}

ARCH=""
TAG="latest"
NO_PUSH=false

while [ $# -gt 0 ]; do
  case "$1" in
    --arch|-a)
      ARCH="$2"
      shift 2
      ;;
    --tag|-t)
      TAG="$2"
      shift 2
      ;;
    --no-push)
      NO_PUSH=true
      shift
      ;;
    -h|--help)
      usage
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}" >&2
      usage
      ;;
  esac
done

# アーキテクチャの正規化 (arm -> arm64, x64 -> amd64)
case "$ARCH" in
  arm|arm64)
    PLATFORM="linux/arm64"
    ;;
  x64|x86_64|amd64)
    PLATFORM="linux/amd64"
    ;;
  "")
    echo -e "${RED}Error: --arch を指定してください (arm64 または amd64)${NC}" >&2
    usage
    ;;
  *)
    echo -e "${RED}Error: 未対応のアーキテクチャ: $ARCH (arm64 または amd64 を指定)${NC}" >&2
    exit 1
    ;;
esac

if [ "$NO_PUSH" = false ] && [ -z "${DOCKERHUB_IMAGE:-}" ]; then
  echo -e "${RED}Error: プッシュする場合は DOCKERHUB_IMAGE を設定してください (例: export DOCKERHUB_IMAGE=myuser/rag-chat-app)${NC}" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

if [ -n "${DOCKERHUB_IMAGE:-}" ]; then
  IMAGE="${DOCKERHUB_IMAGE}:${TAG}"
else
  IMAGE="rag-chat-app:${TAG}"
fi

echo -e "${GREEN}Build Docker image${NC}"
echo "  Platform: $PLATFORM"
echo "  Image:    $IMAGE"
echo ""

if [ "$DOCKER_CMD" = podman ]; then
  "$DOCKER_CMD" build --platform "$PLATFORM" --tag "$IMAGE" .
  if [ "$NO_PUSH" = false ]; then
    "$DOCKER_CMD" push "$IMAGE"
  fi
else
  # buildx が使えない環境では docker build にフォールバック（ホストアーキテクチャのみ）
  set +e
  if [ "$NO_PUSH" = true ]; then
    "$DOCKER_CMD" buildx build --platform "$PLATFORM" --tag "$IMAGE" --load .
  else
    "$DOCKER_CMD" buildx build --platform "$PLATFORM" --tag "$IMAGE" --push .
  fi
  BUILDX_STATUS=$?
  set -e
  if [ "$BUILDX_STATUS" -ne 0 ]; then
    echo -e "${YELLOW}Note: docker buildx が使えないため、ホストのアーキテクチャでビルドします（--arch は無視されます）。${NC}"
    "$DOCKER_CMD" build --tag "$IMAGE" .
    if [ "$NO_PUSH" = false ]; then
      "$DOCKER_CMD" push "$IMAGE"
    fi
  fi
fi

if [ "$NO_PUSH" = true ]; then
  echo -e "${GREEN}Build completed (not pushed).${NC}"
else
  echo -e "${GREEN}Done: $IMAGE (pushed)${NC}"
fi
