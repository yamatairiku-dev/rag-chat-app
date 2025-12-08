#!/bin/bash
# Dify API設定確認スクリプト

echo "=========================================="
echo "Dify API設定確認"
echo "=========================================="
echo ""

# .envファイルの存在確認
if [ ! -f .env ]; then
    echo "❌ .envファイルが見つかりません"
    exit 1
fi

echo "✅ .envファイルが見つかりました"
echo ""

# 環境変数の読み込み
source .env 2>/dev/null || true

# Dify関連の環境変数を確認
echo "📋 Dify API設定:"
echo ""

if [ -z "$DIFY_API_URL" ]; then
    echo "❌ DIFY_API_URL が設定されていません"
else
    echo "✅ DIFY_API_URL: $DIFY_API_URL"
    
    # URLの形式を確認
    if [[ ! "$DIFY_API_URL" =~ ^https?:// ]]; then
        echo "   ⚠️  警告: URLが正しい形式ではありません（http://またはhttps://で始まる必要があります）"
    fi
    
    # /v1が含まれているか確認
    if [[ "$DIFY_API_URL" == *"/v1" ]]; then
        echo "   ✅ /v1が含まれています"
        echo "   📍 エンドポイントURL: ${DIFY_API_URL%/}/chat-messages"
    else
        echo "   ⚠️  警告: /v1が含まれていません"
        echo "   💡 推奨: DIFY_API_URLに/v1を含める（例: https://your-dify.com/v1）"
        echo "   📍 エンドポイントURL: ${DIFY_API_URL%/}/v1/chat-messages"
    fi
fi

echo ""

if [ -z "$DIFY_API_KEY" ]; then
    echo "❌ DIFY_API_KEY が設定されていません"
else
    # APIキーの形式を確認
    if [[ "$DIFY_API_KEY" =~ ^app- ]]; then
        echo "✅ DIFY_API_KEY: ${DIFY_API_KEY:0:10}...${DIFY_API_KEY: -4} (形式OK)"
    else
        echo "⚠️  DIFY_API_KEY: ${DIFY_API_KEY:0:10}...${DIFY_API_KEY: -4}"
        echo "   ⚠️  警告: APIキーは'app-'で始まる必要があります"
    fi
fi

echo ""

if [ -z "$DIFY_TIMEOUT" ]; then
    echo "⚠️  DIFY_TIMEOUT が設定されていません（デフォルト: 30000ms）"
else
    echo "✅ DIFY_TIMEOUT: ${DIFY_TIMEOUT}ms"
fi

echo ""
echo "=========================================="
echo ""

# 接続テストの提案
echo "💡 接続テストを実行するには:"
echo "   tsx test-dify-api.ts"
echo ""



