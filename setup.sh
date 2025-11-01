#!/bin/bash

# 社内RAG検索チャットボット - プロジェクトセットアップスクリプト

echo "================================"
echo "プロジェクトセットアップ開始"
echo "================================"

# プロジェクトディレクトリ構造を作成
echo "📁 ディレクトリ構造を作成中..."

# アプリケーションディレクトリ
mkdir -p app/components/chat
mkdir -p app/components/layout
mkdir -p app/components/ui
mkdir -p app/lib/auth
mkdir -p app/lib/dify
mkdir -p app/lib/graph
mkdir -p app/lib/session
mkdir -p app/lib/logging
mkdir -p app/lib/utils
mkdir -p app/routes
mkdir -p app/types

# テストディレクトリ
mkdir -p tests/unit/lib/auth
mkdir -p tests/unit/lib/dify
mkdir -p tests/unit/lib/graph
mkdir -p tests/unit/lib/session
mkdir -p tests/unit/components
mkdir -p tests/e2e
mkdir -p tests/mocks

# ドキュメントディレクトリ
mkdir -p docs

# その他
mkdir -p public
mkdir -p logs

echo "✅ ディレクトリ構造作成完了"

# .gitkeepファイルを作成（空ディレクトリをgitで管理）
echo "📝 .gitkeepファイルを作成中..."
find . -type d -empty -not -path "./.git/*" -exec touch {}/.gitkeep \;

echo "✅ .gitkeep作成完了"

# .gitignoreファイルを作成
echo "📝 .gitignoreファイルを作成中..."
cat > .gitignore << 'GITIGNORE'
# Environment variables
.env
.env.local
.env.*.local

# Logs
logs/
*.log

# Dependencies
node_modules/

# Build outputs
dist/
build/
.cache/
.react-router/

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Testing
coverage/
.playwright/
test-results/
playwright-report/

# Temporary files
*.tmp
.temp/
GITIGNORE

echo "✅ .gitignore作成完了"

# package.jsonの基本構造を作成（既に存在する場合はスキップ）
if [ ! -f package.json ]; then
    echo "📝 package.jsonを作成中..."
    cat > package.json << 'PACKAGE'
{
  "name": "rag-chat-app",
  "version": "1.0.0",
  "type": "module",
  "description": "社内RAG検索チャットボット",
  "scripts": {
    "dev": "react-router dev",
    "build": "react-router build",
    "start": "react-router-serve ./build/server/index.js",
    "typecheck": "tsc --noEmit",
    "typecheck:watch": "tsc --noEmit --watch",
    "lint": "eslint .",
    "test": "vitest",
    "test:e2e": "playwright test"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router": "^7.0.0",
    "@microsoft/microsoft-graph-client": "^3.0.7",
    "@azure/msal-node": "^2.14.0",
    "winston": "^3.14.0",
    "express-session": "^1.18.0",
    "zod": "^3.23.8",
    "react-markdown": "^9.0.0",
    "remark-gfm": "^4.0.0",
    "react-syntax-highlighter": "^15.5.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@types/node": "^22.0.0",
    "@types/react-syntax-highlighter": "^15.5.0",
    "typescript": "^5.6.0",
    "vite": "^6.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "tailwindcss": "^3.4.0",
    "eslint": "^9.0.0",
    "prettier": "^3.3.0",
    "vitest": "^2.0.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "playwright": "^1.47.0",
    "@playwright/test": "^1.47.0"
  }
}
PACKAGE
    echo "✅ package.json作成完了"
else
    echo "⏭️  package.jsonが既に存在するためスキップ"
fi

# tsconfig.jsonの作成（既に存在する場合はスキップ）
if [ ! -f tsconfig.json ]; then
    echo "📝 tsconfig.jsonを作成中..."
    cat > tsconfig.json << 'TSCONFIG'
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "paths": {
      "~/*": ["./app/*"]
    }
  },
  "include": ["app/**/*", "tests/**/*"],
  "exclude": ["node_modules", "dist", "build"]
}
TSCONFIG
    echo "✅ tsconfig.json作成完了"
else
    echo "⏭️  tsconfig.jsonが既に存在するためスキップ"
fi

echo ""
echo "================================"
echo "✅ セットアップ完了！"
echo "================================"
echo ""
echo "次のステップ:"
echo "1. ダウンロードした仕様書を docs/ ディレクトリにコピー"
echo "2. npm install を実行"
echo "3. .env ファイルを作成（docs/02_環境変数設定.md を参照）"
echo "4. docs/README.md を確認して開発を開始"
echo ""
echo "開発の進め方:"
echo "1. docs/08_実装ガイド_Phase1.md から開始"
echo "2. docs/12_チェックリスト.md で進捗確認"
echo ""
