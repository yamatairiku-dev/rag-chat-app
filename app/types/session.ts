/**
 * ユーザーセッション情報
 */
export interface UserSession {
  /** Entra ID User Object ID */
  userId: string;
  
  /** ユーザーEmail (例: user@company.com) */
  userEmail: string;
  
  /** 表示名 (例: 田中 太郎) */
  displayName: string;
  
  /** 所属コードの配列（グループ ID のリスト） */
  departmentCodes: string[];

  /** 所属部署名の配列（表示名のリスト） */
  departmentNames: string[];
  
  /** Microsoft Graph Access Token */
  accessToken: string;
  
  /** Refresh Token (オプション) */
  refreshToken?: string;
  
  /** トークン有効期限 (Unix timestamp) */
  tokenExpiresAt: number;
  
  /** セッション作成日時 (Unix timestamp) */
  createdAt: number;
  
  /** 最終アクセス日時 (Unix timestamp) */
  lastAccessedAt: number;
}

/**
 * セッションCookie
 */
export interface SessionCookie {
  /** セッションID */
  sessionId: string;
  
  /** 署名 */
  signature: string;
}

/**
 * セッションストレージインターフェース
 */
export interface SessionStorage {
  get(sessionId: string): Promise<UserSession | null>;
  set(sessionId: string, session: UserSession): Promise<void>;
  delete(sessionId: string): Promise<void>;
  exists(sessionId: string): Promise<boolean>;
}

