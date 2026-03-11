# Docker イメージのビルドと Docker Hub へのプッシュ

`scripts/docker-build-push.sh` で、ARM64 / x86_64 向けイメージをビルドし、Docker Hub へプッシュできます。

---

## docker: command not found の場合

Docker が未インストールか PATH にありません。環境に合わせて以下を実行してください。

### Ubuntu / Debian

```bash
sudo apt update
sudo apt install -y docker.io
sudo usermod -aG docker "$USER"
# ログインし直すか、newgrp docker で有効化
```

### macOS（OrbStack 利用時）

- OrbStack を起動すると `docker` コマンドが使えます。
- ターミナルで `docker version` が通るか確認してください。

### macOS（Docker Desktop）

- [Docker Desktop for Mac](https://docs.docker.com/desktop/install/mac-install/) をインストール・起動してください。

### その他 Linux

- [Docker Engine のインストール](https://docs.docker.com/engine/install/) を参照してください。

### ビルドx（buildx）について

クロスビルド（例: x64 マシンで arm64 イメージをビルド）には Docker Buildx が必要です。Docker Desktop や多くの配布版には含まれています。含まれていない場合は以下で有効化できます。

```bash
docker buildx create --use
```

---

## スクリプトの使い方

- 詳細は `./scripts/docker-build-push.sh --help` を参照してください。
- プッシュ前に `docker login` で Docker Hub にログインしてください。
