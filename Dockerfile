# Node 24 最新安定マイナー（24.14.x）に固定
FROM node:24.14-alpine AS development-dependencies-env
COPY . /app
WORKDIR /app
RUN npm ci

FROM node:24.14-alpine AS production-dependencies-env
COPY ./package.json package-lock.json /app/
WORKDIR /app
RUN npm ci --omit=dev

FROM node:24.14-alpine AS build-env
COPY . /app/
COPY --from=development-dependencies-env /app/node_modules /app/node_modules
WORKDIR /app
RUN npm run build

FROM node:24.14-alpine
ENV NODE_ENV=production
ENV PORT=8080
WORKDIR /app
COPY ./package.json package-lock.json ./
COPY --from=production-dependencies-env /app/node_modules ./node_modules
COPY --from=build-env /app/build ./build
RUN chown -R node:node /app
USER node
EXPOSE 8080
LABEL org.opencontainers.image.title="rag-chat-app" \
      org.opencontainers.image.description="RAG Chat App (React Router + Dify)" \
      org.opencontainers.image.source=""
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD node -e "require('http').get('http://127.0.0.1:' + (process.env.PORT || 8080) + '/', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"
CMD ["node", "node_modules/@react-router/serve/bin.js", "./build/server/index.js"]
