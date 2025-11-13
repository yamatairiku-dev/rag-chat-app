/**
 * エラーコード
 */
export enum ErrorCode {
  // 認証エラー (1xxx)
  AUTH_INVALID_TOKEN = 1001,
  AUTH_TOKEN_EXPIRED = 1002,
  AUTH_NO_PERMISSION = 1003,
  AUTH_DEPARTMENT_NOT_FOUND = 1004,
  AUTH_SESSION_EXPIRED = 1005,
  AUTH_INVALID_SESSION = 1006,
  
  // Graph API エラー (1xxx)
  GRAPH_API_ERROR = 1100,
  GRAPH_USER_NOT_FOUND = 1101,
  GRAPH_GROUP_NOT_FOUND = 1102,
  
  // Dify API エラー (2xxx)
  DIFY_CONNECTION_FAILED = 2001,
  DIFY_TIMEOUT = 2002,
  DIFY_INVALID_RESPONSE = 2003,
  DIFY_API_ERROR = 2004,
  DIFY_STREAMING_ERROR = 2005,
  
  // バリデーションエラー (3xxx)
  VALIDATION_EMPTY_MESSAGE = 3001,
  VALIDATION_MESSAGE_TOO_LONG = 3002,
  VALIDATION_INVALID_INPUT = 3003,
  
  // レートリミットエラー (4xxx)
  RATE_LIMIT_EXCEEDED = 4001,
  
  // システムエラー (5xxx)
  INTERNAL_SERVER_ERROR = 5000,
  DATABASE_ERROR = 5001,
  CONFIGURATION_ERROR = 5002,
}

/**
 * アプリケーションエラー
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly timestamp: number;
  
  constructor(
    code: ErrorCode,
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true
  ) {
    super(message);
    
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = Date.now();
    
    // Stackトレースを正しく保持
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * エラーレスポンス
 */
export interface ErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
    details?: any;
  };
  timestamp: number;
}

