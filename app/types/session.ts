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
  
  /** 所属コード (例: 001, 002) */
  departmentCode: string;
  
  /** 所属部署名 (例: 営業部) */
  departmentName?: string;
  
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

