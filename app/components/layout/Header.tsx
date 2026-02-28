import { Form } from "react-router";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";

interface HeaderUser {
  displayName: string;
  userEmail: string;
  departmentCodes: string[];
  departmentNames: string[];
}

interface HeaderProps {
  user: HeaderUser;
  /** ヘッダー左側に表示するアプリケーションタイトル（未指定時は「Difyフロントエンドアプリ」） */
  appTitle?: string;
  errorMessage?: string | null;
}

function getInitials(displayName: string): string {
  const trimmed = displayName.trim();
  if (!trimmed) {
    return "U";
  }

  const parts = trimmed.split(/\s+/);
  const letters =
    parts.length === 1
      ? parts[0]!.slice(0, 2)
      : parts.map((part) => part[0]).join("");

  return letters.toUpperCase().slice(0, 2);
}

function formatDepartments(names: string[], _codes: string[]): string {
  if (names.length === 0 && _codes.length === 0) return "未設定";
  if (names.length > 0) {
    return names.join(" / ");
  }
  return "未設定";
}

export function Header({ user, appTitle = "Difyフロントエンドアプリ", errorMessage }: HeaderProps) {
  const initials = getInitials(user.displayName);

  return (
    <header className="border-b border-border bg-card" role="banner">
      <div className="container mx-auto flex items-center justify-between px-4 py-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">{appTitle}</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right text-xs" aria-label="ユーザー情報">
            <p className="font-medium text-foreground">{user.displayName}</p>
            <p className="text-muted-foreground" aria-label={`メールアドレス: ${user.userEmail}`}>{user.userEmail}</p>
            <p className="text-muted-foreground">{formatDepartments(user.departmentNames, user.departmentCodes)}</p>
          </div>
          <Avatar aria-label={`${user.displayName}のアバター`}>
            <AvatarFallback aria-hidden="true">{initials}</AvatarFallback>
          </Avatar>
          <Form method="post" action="/auth/logout">
            <Button variant="outline" size="sm" type="submit" aria-label="ログアウト">
              ログアウト
            </Button>
          </Form>
        </div>
      </div>
      {errorMessage && (
        <div className="border-t border-destructive/20 bg-destructive/10" role="alert" aria-live="polite">
          <div className="container mx-auto px-4 py-2">
            <p className="text-xs text-destructive">{errorMessage}</p>
          </div>
        </div>
      )}
    </header>
  );
}

