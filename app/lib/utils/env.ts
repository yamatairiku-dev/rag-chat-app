// app/lib/utils/env.ts
import { z } from 'zod';

const envSchema = z.object({
  // App
  NODE_ENV: z.enum(['development', 'production', 'test']),
  PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)),

  // Entra ID
  ENTRA_CLIENT_ID: z.string().uuid('Invalid Entra Client ID format'),
  ENTRA_CLIENT_SECRET: z.string().min(1, 'Entra Client Secret is required'),
  ENTRA_TENANT_ID: z.string().uuid('Invalid Entra Tenant ID format'),
  ENTRA_REDIRECT_URI: z.string().url('Invalid Redirect URI'),
  ENTRA_POST_LOGOUT_REDIRECT_URI: z.string().url('Invalid Post Logout Redirect URI'),
  ENTRA_AUTHORITY: z.string().url().default('https://login.microsoftonline.com'),

  // Graph API
  GRAPH_API_URL: z.string().url().default('https://graph.microsoft.com/v1.0'),
  GRAPH_API_SCOPE: z.string().default('https://graph.microsoft.com/.default'),
  /** 部署グループの表示名にマッチさせる正規表現パターン（例: ^ZA[A-Za-z]\\d{3}-[A-Za-z]） */
  GRAPH_DEPARTMENT_GROUP_PREFIX: z
    .string()
    .default('^ZA[A-Za-z]\\d{3}-[A-Za-z]')
    .refine(
      (s) => {
        try {
          new RegExp(s);
          return true;
        } catch {
          return false;
        }
      },
      { message: 'GRAPH_DEPARTMENT_GROUP_PREFIX must be a valid regex pattern' }
    ),

  // Dify
  DIFY_API_URL: z.string().url('Invalid Dify API URL'),
  DIFY_API_KEY: z.string().startsWith('app-', 'Dify API Key must start with "app-"'),
  DIFY_TIMEOUT: z.string().transform(Number).pipe(z.number().positive()).default('30000'),
  DIFY_MAX_RETRIES: z.string().transform(Number).pipe(z.number().min(0).max(10)).default('3'),

  // Session
  SESSION_SECRET: z.string().min(32, 'Session secret must be at least 32 characters'),
  SESSION_MAX_AGE: z.string().transform(Number).pipe(z.number().positive()).default('86400000'),
  SESSION_RESET_HOUR: z.string().transform(Number).pipe(z.number().min(0).max(23)).default('0'),
  SESSION_STORAGE: z.enum(['memory', 'redis']).default('memory'),

  // Cookie
  COOKIE_DOMAIN: z.string().optional(),
  COOKIE_SECURE: z.string().transform(val => val === 'true').default('true'),
  COOKIE_SAME_SITE: z.enum(['strict', 'lax', 'none']).default('lax'),
  COOKIE_HTTP_ONLY: z.string().transform(val => val === 'true').default('true'),

  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  LOG_DIRECTORY: z.string().default('./logs'),
  LOG_MAX_FILES: z.string().transform(Number).pipe(z.number().positive()).default('30'),

  // Performance
  MAX_MESSAGE_LENGTH: z.string().transform(Number).pipe(z.number().positive()).default('2000'),
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).pipe(z.number().positive()).default('60000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).pipe(z.number().positive()).default('30'),
});

export type Env = z.infer<typeof envSchema>;

// 環境変数をバリデーションして取得
export function validateEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(err => `  - ${err.path.join('.')}: ${err.message}`);
      throw new Error(`環境変数の検証に失敗しました:\n${missingVars.join('\n')}`);
    }
    throw error;
  }
}

export const env = validateEnv();

