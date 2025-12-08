# 即座に実行すべき次のステップ

**作成日**: 2025年1月  
**現在の状況**: Phase 1-4完了、E2Eテスト20/20成功、ユニットテスト39成功

---

## 🎯 優先度: 最高 🔴

### 1. テストカバレッジレポートの生成と確認（30分）

**目的**: 現在のテストカバレッジを把握し、改善点を特定

**実行手順**:
```bash
# カバレッジレポートを生成
npm run test -- --coverage

# カバレッジレポートを確認
# coverage/ ディレクトリにHTMLレポートが生成されます
```

**確認ポイント**:
- 全体のカバレッジ率
- カバレッジが低いファイル・モジュール
- テストが不足しているコンポーネント

**期待される結果**:
- カバレッジレポートの生成
- 改善が必要な領域の特定
- 次のアクションの明確化

---

### 2. UIコンポーネントのユニットテスト追加（2-3時間）

**目的**: UIコンポーネントの品質保証とリグレッション防止

**実装すべきテスト**:

#### 2.1. `tests/unit/components/chat/ChatMessage.test.tsx`

**テストケース**:
- [ ] ユーザーメッセージの表示
- [ ] アシスタントメッセージの表示
- [ ] Markdownレンダリングの確認
- [ ] コードブロックのハイライト表示
- [ ] ストリーミング中の表示（`isStreaming`フラグ）
- [ ] エラーメッセージの表示
- [ ] 空のメッセージの処理

**実装例**:
```typescript
import { render, screen } from '@testing-library/react';
import { ChatMessage } from '~/components/chat/ChatMessage';
import type { Message } from '~/types/chat';

describe('ChatMessage', () => {
  it('ユーザーメッセージを正しく表示する', () => {
    const message: Message = {
      role: 'user',
      content: 'テストメッセージ',
    };
    render(<ChatMessage message={message} />);
    expect(screen.getByText('テストメッセージ')).toBeInTheDocument();
  });

  it('Markdownを正しくレンダリングする', () => {
    const message: Message = {
      role: 'assistant',
      content: '**太字**と`コード`を含むメッセージ',
    };
    render(<ChatMessage message={message} />);
    // Markdownのレンダリングを確認
  });
});
```

#### 2.2. `tests/unit/components/layout/Header.test.tsx`

**テストケース**:
- [ ] ユーザー情報の表示（表示名、メール、部署コード）
- [ ] ログアウトボタンの表示
- [ ] エラーメッセージの表示
- [ ] ユーザー情報が未設定の場合の処理

---

### 3. 不足しているユニットテストの追加（2-3時間）

**目的**: カバレッジの向上と品質保証

#### 3.1. `tests/unit/lib/session/token-refresh.test.ts`

**テストケース**:
- [ ] トークンの有効期限チェック
- [ ] トークンの自動更新
- [ ] 更新失敗時のエラーハンドリング
- [ ] セッションの更新

#### 3.2. `tests/unit/lib/chat/conversation-store.test.ts`

**テストケース**:
- [ ] 会話の作成
- [ ] 会話の取得
- [ ] 会話の更新
- [ ] 会話の削除
- [ ] ユーザー別の会話一覧取得
- [ ] 会話が見つからない場合の処理

#### 3.3. `tests/unit/lib/errors/error-handler.test.ts`

**テストケース**:
- [ ] AppErrorの処理
- [ ] 一般的なエラーの処理
- [ ] エラーログの出力
- [ ] エラーレスポンスの生成

---

## 🎯 優先度: 高 🟠

### 4. CI/CDパイプラインの設定（2-3時間）

**目的**: 自動化による品質保証と開発効率の向上

**実装内容**:

#### 4.1. GitHub Actionsワークフローの作成

**ファイル**: `.github/workflows/test.yml`

```yaml
name: Test

on:
  push:
    branches: [ master, main, develop ]
  pull_request:
    branches: [ master, main, develop ]

jobs:
  unit-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
      - run: npm ci
      - run: npm run typecheck
      - run: npm test -- --coverage
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json

  e2e-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

**実装手順**:
1. `.github/workflows/` ディレクトリを作成
2. `test.yml` ファイルを作成
3. プッシュして動作確認

---

### 5. パフォーマンス最適化（2-3時間）

**目的**: アプリケーションの応答性向上

**実装内容**:

#### 5.1. バンドルサイズの分析

```bash
# ビルドしてバンドルサイズを確認
npm run build

# バンドルサイズの分析ツールを使用
npx vite-bundle-visualizer
```

#### 5.2. メッセージリストの仮想化

**対象**: `app/routes/chat.tsx`

**実装**:
- `react-window` または `react-virtual` の導入
- 大量メッセージ時のパフォーマンス改善

#### 5.3. ローディング状態の改善

- スケルトンローディングの追加
- プログレスインジケーターの改善

---

## 🎯 優先度: 中 🟡

### 6. アクセシビリティの改善（2-3時間）

**目的**: すべてのユーザーが利用可能なアプリケーション

**実装内容**:

#### 6.1. ARIAラベルの追加

- フォーム要素への適切なラベル
- ボタンの説明追加
- ロール属性の適切な設定

#### 6.2. キーボードナビゲーションの改善

- Tab順序の確認
- フォーカス管理の改善
- キーボードショートカットの追加

#### 6.3. スクリーンリーダー対応の確認

- VoiceOver（macOS）でのテスト
- NVDA（Windows）でのテスト

---

## 📋 実行チェックリスト

### 今すぐ実行（今日中）

- [ ] テストカバレッジレポートの生成
- [ ] カバレッジが低い領域の特定
- [ ] UIコンポーネントのテスト追加計画

### 今週中に実行

- [ ] UIコンポーネントのユニットテスト実装
- [ ] 不足しているユニットテストの追加
- [ ] CI/CDパイプラインの設定開始

### 来週以降

- [ ] パフォーマンス最適化
- [ ] アクセシビリティの改善
- [ ] ドキュメントの整備

---

## 🚀 推奨される実行順序

1. **テストカバレッジレポートの生成**（30分）
   - 現状把握が最優先

2. **UIコンポーネントのテスト追加**（2-3時間）
   - ユーザーに直接影響する部分の品質保証

3. **不足しているユニットテストの追加**（2-3時間）
   - カバレッジ目標（80%以上）の達成

4. **CI/CDパイプラインの設定**（2-3時間）
   - 自動化による品質保証の継続

---

## 💡 技術的なヒント

### テストカバレッジの確認

```bash
# カバレッジレポートを生成
npm run test -- --coverage

# HTMLレポートを開く
open coverage/index.html
# または
npx serve coverage
```

### テストの書き方

- **AAAパターン**: Arrange（準備）、Act（実行）、Assert（検証）
- **テストの独立性**: 各テストは独立して実行可能に
- **モックの適切な使用**: 外部依存をモック化

### CI/CDのベストプラクティス

- テストが失敗した場合はビルドを失敗させる
- カバレッジレポートをアップロード
- テスト結果を可視化

---

**最終更新**: 2025年1月





