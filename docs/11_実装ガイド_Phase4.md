# 実装ガイド Phase 4: 機能拡張

**所要時間**: 8-12時間  
**目的**: チャット履歴、設定画面、テストの実装

---

## 実装順序

1. チャット履歴機能 (3-4時間)
2. 設定画面 (2-3時間)
3. エラーハンドリング強化 (2時間)
4. テスト実装 (3-4時間)

---

## ステップ1: チャット履歴機能

[03_API仕様.md](./03_API仕様.md) の GET /conversations/:conversation_id/messages を参照

---

## ステップ2: 設定画面

ユーザー情報表示と設定変更機能を実装

---

## ステップ3: テスト実装

### ユニットテスト

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

### E2Eテスト

```bash
npm install -D playwright @playwright/test
npx playwright install
```

---

## Phase 4完了基準

- ✅ チャット履歴が表示される
- ✅ 設定画面が動作する
- ✅ エラーハンドリングが適切
- ✅ テストが通る

---

**最終ステップ**: [チェックリスト](./12_チェックリスト.md) で全体を確認
