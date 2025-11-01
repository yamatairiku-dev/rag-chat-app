# 実装ガイド Phase 3: UI/UX改善

**所要時間**: 4-6時間  
**目的**: shadcn/uiを活用した洗練されたUIの実装

---

## 実装順序

1. shadcn/ui セットアップ (1時間)
2. レイアウトコンポーネント (2-3時間)
3. チャットUI改善 (2時間)

---

## ステップ1: shadcn/ui セットアップ

```bash
npx shadcn@latest init
npx shadcn@latest add button
npx shadcn@latest add input
npx shadcn@latest add card
npx shadcn@latest add avatar
npx shadcn@latest add scroll-area
npx shadcn@latest add separator
```

---

## ステップ2: レイアウトコンポーネント

### ヘッダー

```typescript
// app/components/layout/Header.tsx
import { Avatar, AvatarFallback } from '~/components/ui/avatar';
import { Button } from '~/components/ui/button';
import { Form } from 'react-router';

interface HeaderProps {
  user: {
    displayName: string;
    userEmail: string;
    departmentCode: string;
  };
}

export function Header({ user }: HeaderProps) {
  const initials = user.displayName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase();

  return (
    <header className="border-b bg-white px-6 py-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">RAG検索チャットボット</h1>
        
        <div className="flex items-center gap-4">
          <div className="text-sm">
            <p className="font-medium">{user.displayName}</p>
            <p className="text-gray-500">{user.departmentCode}</p>
          </div>
          
          <Avatar>
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          
          <Form method="post" action="/logout">
            <Button variant="outline" type="submit">
              ログアウト
            </Button>
          </Form>
        </div>
      </div>
    </header>
  );
}
```

---

## ステップ3: チャットUI改善

### Markdownレンダリング

```bash
npm install react-markdown remark-gfm
npm install react-syntax-highlighter @types/react-syntax-highlighter
```

```typescript
// app/components/chat/ChatMessage.tsx
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface ChatMessageProps {
  message: {
    role: 'user' | 'assistant';
    content: string;
  };
}

export function ChatMessage({ message }: ChatMessageProps) {
  return (
    <div className={`mb-4 ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
      <div className={`inline-block max-w-3xl p-4 rounded-lg ${
        message.role === 'user' 
          ? 'bg-blue-600 text-white' 
          : 'bg-gray-100'
      }`}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code({ node, inline, className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || '');
              return !inline && match ? (
                <SyntaxHighlighter
                  style={vscDarkPlus}
                  language={match[1]}
                  PreTag="div"
                  {...props}
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              ) : (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            },
          }}
        >
          {message.content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
```

---

## Phase 3完了基準

- ✅ 洗練されたUIデザイン
- ✅ レスポンシブ対応
- ✅ Markdownレンダリング
- ✅ コードブロックのハイライト

---

**次のステップ**: [Phase 4: 機能拡張](./11_実装ガイド_Phase4.md)
