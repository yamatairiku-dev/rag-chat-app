import { Form } from "react-router";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";

interface HeaderUser {
  displayName: string;
  userEmail: string;
  departmentCode: string;
  departmentName?: string;
}

interface HeaderProps {
  user: HeaderUser;
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

export function Header({ user, errorMessage }: HeaderProps) {
  const initials = getInitials(user.displayName);

  return (
    <header className="border-b bg-white">
      <div className="container mx-auto flex items-center justify-between px-4 py-4">
        <div>
          <h1 className="text-xl font-bold">社内RAG検索チャットボット</h1>
          <p className="text-xs text-gray-500">
            {user.departmentName
              ? `${user.departmentName} (${user.departmentCode})`
              : user.departmentCode}{" "}
            / {user.displayName}
          </p>
          <p className="text-xs text-gray-400">{user.userEmail}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right text-xs">
            <p className="font-medium">{user.displayName}</p>
            <p className="text-gray-500">{user.departmentCode}</p>
          </div>
          <Avatar>
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <Form method="post" action="/auth/logout">
            <Button variant="outline" size="sm" type="submit">
              ログアウト
            </Button>
          </Form>
        </div>
      </div>
      {errorMessage && (
        <div className="border-t border-red-100 bg-red-50">
          <div className="container mx-auto px-4 py-2">
            <p className="text-xs text-red-600">{errorMessage}</p>
          </div>
        </div>
      )}
    </header>
  );
}

