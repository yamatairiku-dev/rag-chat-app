# Difyでinputs情報を受け取り処理する方法

**作成日**: 2025年12月5日  
**目的**: Dify側でAPIから送信されるinputs情報を受け取り、ワークフローやアプリケーションで処理する方法を説明

---

## 📋 概要

このアプリケーションからDify APIに送信される`inputs`情報は、Difyのワークフローやアプリケーション内で変数として使用できます。

### 送信されるinputs情報

```json
{
  "inputs": {
    "user_id": "tanaka@company.com",
    "department_code": "001"
  },
  "query": "年次有給休暇の取得方法を教えてください",
  "response_mode": "streaming",
  "conversation_id": "",
  "user": "tanaka@company.com"
}
```

---

## 🔧 Dify側での設定方法

### 1. アプリケーション/ワークフローの作成

1. Difyの管理画面にログイン
2. 「アプリ」または「ワークフロー」を選択
3. 新しいアプリケーション/ワークフローを作成

### 2. 「開始」ノードの入力フィールド設定

**重要**: `inputs`で送信する情報は、**「開始」ノードの入力フィールド**として設定する必要があります。

#### 設定手順

1. **ワークフロー編集画面**で「開始」ノードを選択
2. 右側の設定パネルで**「入力フィールド」**セクションを確認
3. **「入力フィールドを追加」**をクリック
4. 以下の入力フィールドを追加：

   **入力フィールド1: `user_id`**
   
   「入力フィールドを追加」画面で以下を設定：
   - **フィールドタイプ**: `短文` (string) を選択
   - **変数名**: `user_id` を入力
   - **ラベル名**: `ユーザーID` など、表示用の名前を入力（任意）
   - **最大長**: `255` など、Emailアドレスの最大長を設定（任意）
   - **デフォルト値**: （空欄のまま）
   - **必須**: ✅ チェックを入れる
   - **非表示**: チェックしない（通常は表示）
   
   **入力フィールド2: `department_code`**
   
   「入力フィールドを追加」画面で以下を設定：
   - **フィールドタイプ**: `短文` (string) を選択
   - **変数名**: `department_code` を入力
   - **ラベル名**: `部署コード` など、表示用の名前を入力（任意）
   - **最大長**: `10` など、部署コードの最大長を設定（任意）
   - **デフォルト値**: （空欄のまま）
   - **必須**: ✅ チェックを入れる
   - **非表示**: チェックしない（通常は表示）

   **入力フィールド3: `query`**（通常は自動で追加される）
   
   もし手動で追加する場合：
   - **フィールドタイプ**: `長文` (text) を選択（推奨）または `短文` (string)
   - **変数名**: `query` または `userinput.query` を入力
   - **ラベル名**: `質問` など、表示用の名前を入力（任意）
   - **最大長**: `2000` など、質問の最大長を設定（任意）
   - **デフォルト値**: （空欄のまま）
   - **必須**: ✅ チェックを入れる
   - **非表示**: チェックしない（通常は表示）

#### 設定画面の各項目の説明

| 項目 | 説明 | 必須 |
|------|------|------|
| **フィールドタイプ** | データ型を選択（`短文`=string、`長文`=text、`数値`=number など） | ✅ |
| **変数名** | APIから送信される`inputs`のキー名と**完全に一致**させる必要がある | ✅ |
| **ラベル名** | ユーザー向けの表示名（任意） | ❌ |
| **最大長** | 入力値の最大文字数（任意） | ❌ |
| **デフォルト値** | デフォルトで設定される値（任意） | ❌ |
| **必須** | このフィールドが必須かどうか | ✅ |
| **非表示** | このフィールドを非表示にするかどうか | ❌ |

#### 注意事項

- **フィールド名の一致**: APIから送信する`inputs`のキー名と、Dify側で設定した入力フィールド名が**完全に一致**している必要があります
- **必須フィールド**: 必須として設定したフィールドは、APIリクエストで必ず送信する必要があります
- **自動追加されるフィールド**: `query`は通常、Difyが自動的に`userinput.query`として追加しますが、カスタム名を使用する場合は手動で設定してください

### 3. ワークフローでの使用

「開始」ノードで定義した入力フィールドは、ワークフロー内のすべてのノードで参照できます。

#### 方法1: ノード内で直接参照

ワークフローの各ノードで、以下の形式で変数を参照できます：

- **シンプルな参照**: `{{#inputs.user_id#}}` や `{{#inputs.department_code#}}`
- **queryの参照**: `{{#query#}}` または `{{#userinput.query#}}`（設定による）

**例: LLMノードでの使用**

```
プロンプトテンプレート:
あなたは{{#inputs.department_code#}}部署の社員向けのAIアシスタントです。
ユーザーID: {{#inputs.user_id#}}
ユーザーの質問: {{#query#}}

上記の情報を基に、適切な回答を生成してください。
```

#### 方法2: コードノードでの使用

Pythonコードノードで、`inputs`辞書から値を取得できます：

```python
# inputsから値を取得
user_id = inputs.get('user_id', '')
department_code = inputs.get('department_code', '')

# 処理例: 部署コードに基づいて異なる処理を実行
if department_code == '001':
    # 営業部向けの処理
    context = "営業部向けの情報です。"
elif department_code == '002':
    # 開発部向けの処理
    context = "開発部向けの情報です。"
else:
    context = "一般的な情報です。"

# 結果を返す
outputs = {
    'context': context,
    'user_id': user_id
}
```

#### 方法3: HTTPリクエストノードでの使用

外部APIを呼び出す際に、`inputs`の値をパラメータとして使用：

```
URL: https://api.example.com/user-info
Method: POST
Body:
{
  "user_id": "{{#inputs.user_id#}}",
  "department_code": "{{#inputs.department_code#}}"
}
```

### 4. 条件分岐での使用

**IF条件ノード**で、`inputs`の値に基づいて分岐処理：

```
条件式:
{{#inputs.department_code#}} == '001'
```

または、より複雑な条件：

```
条件式:
{{#inputs.department_code#}} in ['001', '002', '003']
```

---

## 📝 実装例

### 例1: 部署コードに基づいた応答のカスタマイズ

**ワークフロー構成**:
1. **開始ノード** → 2. **IF条件ノード** → 3. **LLMノード** → 4. **終了ノード**

**IF条件ノードの設定**:
```
条件: {{#inputs.department_code#}} == '001'
```

**LLMノードのプロンプト**:
```
部署コード: {{#inputs.department_code#}}
ユーザーID: {{#inputs.user_id#}}

{{#query#}}について、上記の部署に適した回答を生成してください。
```

### 例2: ユーザー情報をコンテキストに追加

**コードノードの実装**:

```python
# inputsから値を取得
user_id = inputs.get('user_id', '')
department_code = inputs.get('department_code', '')

# ユーザー情報をコンテキストとして構築
user_context = f"""
ユーザー情報:
- ユーザーID: {user_id}
- 部署コード: {department_code}
"""

# 次のノードに渡す
outputs = {
    'user_context': user_context,
    'query': query  # 元のクエリも保持
}
```

### 例3: データセット検索での使用

**知識検索ノード**の設定で、`inputs`の値を使用して検索条件をカスタマイズ：

```
検索クエリ: {{#query#}}
フィルター条件:
- department_code: {{#inputs.department_code#}}
- user_id: {{#inputs.user_id#}}
```

---

## 🔍 デバッグ方法

### 1. ログでの確認

Difyのワークフロー実行ログで、`inputs`の値を確認できます：

1. **実行履歴** → **詳細** を開く
2. 各ノードの入力/出力を確認
3. `inputs`オブジェクトの内容を確認

### 2. デバッグノードの追加

ワークフローに**コードノード**を追加して、`inputs`の値をログ出力：

```python
import logging

# inputsの内容をログに出力
logging.info(f"Inputs received: {inputs}")

# 次のノードにそのまま渡す
outputs = inputs
```

### 3. テスト実行

Difyの管理画面で、テスト実行時に`inputs`の値を手動で設定：

```
テスト入力:
{
  "user_id": "test@company.com",
  "department_code": "001"
}
```

---

## ⚠️ 注意事項

### 1. 入力フィールド名の一致

APIから送信する`inputs`のキー名と、Dify側の「開始」ノードで設定した入力フィールド名が**完全に一致**している必要があります。

✅ **正しい例**:
```json
{
  "inputs": {
    "user_id": "tanaka@company.com",
    "department_code": "001"
  },
  "query": "年次有給休暇の取得方法を教えてください"
}
```

Dify側の「開始」ノードの入力フィールド設定:
- `user_id` (文字列、必須)
- `department_code` (文字列、必須)
- `query` または `userinput.query` (文字列、必須)

❌ **間違った例**:
```json
{
  "inputs": {
    "userId": "tanaka@company.com",  // フィールド名が不一致
    "departmentCode": "001"          // フィールド名が不一致
  }
}
```

### 2. 必須入力フィールドの設定

Dify側の「開始」ノードで必須として設定した入力フィールドは、APIリクエストの`inputs`で必ず送信する必要があります。必須フィールドが送信されていない場合、Dify APIはエラーを返します。

### 3. 型の一致

入力フィールドの型（文字列、数値、ブール値など）が、APIから送信する値の型と一致していることを確認してください。

### 4. 入力フィールドの参照方法

ワークフロー内の各ノードで、入力フィールドを参照する際は、以下の形式を使用：

- **シンプルな参照**: `{{#inputs.user_id#}}` または `{{#user_id#}}`
- **条件式での使用**: `{{#inputs.department_code#}} == '001'`
- **文字列結合**: `ユーザー: {{#inputs.user_id#}}`
- **queryの参照**: `{{#query#}}` または `{{#userinput.query#}}`

**注意**: 参照形式は、Difyのバージョンや設定によって異なる場合があります。実際のワークフローエディタで確認してください。

---

## 📊 現在のアプリケーションでの送信形式

このアプリケーションから送信される`inputs`の形式：

```typescript
{
  inputs: {
    user_id: session.userEmail,        // 例: "tanaka@company.com"
    department_code: session.departmentCode, // 例: "001"
  },
  query: trimmedQuery,                 // ユーザーの質問（inputsには含まれない）
  response_mode: "streaming" | "blocking",
  conversation_id: initialConversationId,
  user: session.userEmail,
}
```

### Dify側での対応設定

Difyの「開始」ノードで、以下の入力フィールドを設定してください：

| 入力フィールド名 | 型 | 必須 | 説明 | APIでの送信先 |
|----------------|-----|------|------|--------------|
| `user_id` | String | ✅ | ユーザーのEmailアドレス | `inputs.user_id` |
| `department_code` | String | ✅ | 所属部署コード | `inputs.department_code` |
| `query` または `userinput.query` | String | ✅ | ユーザーの質問 | `query`（`inputs`の外） |

**注意**: `query`は`inputs`の外側で送信されますが、Dify側では「開始」ノードの入力フィールドとして定義できます。

### コード参照

```119:128:app/routes/api.chat-stream.ts
        for await (const event of client.streamMessage({
          inputs: {
            user_id: session.userEmail,
            department_code: session.departmentCode,
          },
          query: trimmedQuery,
          response_mode: "streaming",
          conversation_id: initialConversationId,
          user: session.userEmail,
        })) {
```

---

## 🔗 関連ドキュメント

- [Dify API送信情報](./Dify_API送信情報.md)
- [API仕様](./03_API仕様.md)
- [Dify公式ドキュメント](https://docs.dify.ai/)

---

## 📚 参考リソース

### Dify公式ドキュメント

- [Dify API リファレンス](https://docs.dify.ai/api-reference/)
- [ワークフロー変数の使用](https://docs.dify.ai/guides/workflow/variables)
- [プロンプトテンプレート](https://docs.dify.ai/guides/prompt-engineering/prompt-templates)

### このアプリケーションの実装

- **クライアント実装**: `app/lib/dify/client.ts`
- **ストリーミングAPI**: `app/routes/api.chat-stream.ts`
- **ブロッキングAPI**: `app/routes/chat.tsx`
- **型定義**: `app/types/dify.ts`

---

**最終更新**: 2025年12月5日

