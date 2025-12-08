#!/bin/bash
# 開発環境動作確認スクリプト

set -e

echo "🔍 開発環境動作確認スクリプト"
echo "================================"
echo ""

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# チェック関数
check() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $1${NC}"
        return 0
    else
        echo -e "${RED}❌ $1${NC}"
        return 1
    fi
}

warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# 1. 環境変数の確認
echo "1. 環境変数の確認"
echo "-------------------"
if [ -f .env ]; then
    check ".envファイルが存在します"
    
    # 必須環境変数の確認
    required_vars=(
        "NODE_ENV"
        "PORT"
        "ENTRA_CLIENT_ID"
        "ENTRA_CLIENT_SECRET"
        "ENTRA_TENANT_ID"
        "ENTRA_REDIRECT_URI"
        "DIFY_API_URL"
        "DIFY_API_KEY"
        "SESSION_SECRET"
    )
    
    missing_vars=()
    for var in "${required_vars[@]}"; do
        if ! grep -q "^${var}=" .env; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -eq 0 ]; then
        check "必須環境変数がすべて設定されています"
    else
        warn "以下の環境変数が設定されていません:"
        for var in "${missing_vars[@]}"; do
            echo "  - $var"
        done
    fi
else
    warn ".envファイルが存在しません"
    echo "  .env.exampleをコピーして.envファイルを作成してください"
fi
echo ""

# 2. 依存関係の確認
echo "2. 依存関係の確認"
echo "-------------------"
if [ -d node_modules ]; then
    check "node_modulesディレクトリが存在します"
else
    warn "node_modulesディレクトリが存在しません"
    echo "  npm installを実行してください"
fi
echo ""

# 3. ビルドの確認
echo "3. ビルドの確認"
echo "-------------------"
if [ -d build ]; then
    check "buildディレクトリが存在します"
    if [ -d build/client ] && [ -d build/server ]; then
        check "build/clientとbuild/serverが存在します"
    else
        warn "buildディレクトリの構造が不完全です"
    fi
else
    warn "buildディレクトリが存在しません"
    echo "  npm run buildを実行してください"
fi
echo ""

# 4. 型チェック
echo "4. 型チェック"
echo "-------------------"
if npm run typecheck > /dev/null 2>&1; then
    check "型チェックが成功しました"
else
    warn "型チェックでエラーが発生しました"
    echo "  npm run typecheckを実行して詳細を確認してください"
fi
echo ""

# 5. テストの確認
echo "5. テストの確認"
echo "-------------------"
if npm test -- --run > /dev/null 2>&1; then
    check "テストが成功しました"
else
    warn "テストでエラーが発生しました"
    echo "  npm testを実行して詳細を確認してください"
fi
echo ""

# 6. ポートの確認
echo "6. ポートの確認"
echo "-------------------"
PORT=${PORT:-3000}
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    warn "ポート $PORT は既に使用されています"
    echo "  別のポートを使用するか、既存のプロセスを終了してください"
else
    check "ポート $PORT は使用可能です"
fi
echo ""

# 7. セッションシークレットの確認
echo "7. セッションシークレットの確認"
echo "-------------------"
if [ -f .env ]; then
    SESSION_SECRET=$(grep "^SESSION_SECRET=" .env | cut -d '=' -f2 | tr -d '"' | tr -d "'")
    if [ -n "$SESSION_SECRET" ]; then
        LENGTH=${#SESSION_SECRET}
        if [ $LENGTH -ge 32 ]; then
            check "SESSION_SECRETが設定されています（長さ: $LENGTH文字）"
        else
            warn "SESSION_SECRETが32文字未満です（現在: $LENGTH文字）"
            echo "  以下のコマンドで生成してください:"
            echo "  node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
        fi
    else
        warn "SESSION_SECRETが設定されていません"
    fi
fi
echo ""

# 8. まとめ
echo "================================"
echo "確認完了"
echo ""
echo "次のステップ:"
echo "1. 環境変数を確認・設定"
echo "2. npm run dev で開発サーバーを起動"
echo "3. ブラウザで http://localhost:$PORT にアクセス"
echo "4. 動作確認を実施"
echo ""
echo "詳細は docs/16_開発環境動作確認手順.md を参照してください"

