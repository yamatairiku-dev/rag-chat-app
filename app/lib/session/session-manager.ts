// app/lib/session/session-manager.ts
import { randomBytes, createHmac } from "crypto";
import { redirect } from "react-router";
import type { UserSession } from "~/types/session";
import { env } from "~/lib/utils/env";
import { memoryStorage } from "./memory-storage";
import { AppError, ErrorCode } from "~/types/error";

const storage = memoryStorage; // 将来的にRedis対応

/**
 * セッションIDを生成
 */
function generateSessionId(): string {
  return randomBytes(32).toString('hex');
}

/**
 * セッションIDに署名を追加
 */
function signSessionId(sessionId: string): string {
  const signature = createHmac('sha256', env.SESSION_SECRET)
    .update(sessionId)
    .digest('hex');
  return `${sessionId}.${signature}`;
}

/**
 * 署名を検証
 */
function verifySessionId(signedSessionId: string): string | null {
  const [sessionId, signature] = signedSessionId.split('.');
  
  if (!sessionId || !signature) {
    return null;
  }
  
  const expectedSignature = createHmac('sha256', env.SESSION_SECRET)
    .update(sessionId)
    .digest('hex');
  
  if (signature !== expectedSignature) {
    return null;
  }
  
  return sessionId;
}

/**
 * Cookieを解析
 */
function parseCookie(cookieHeader: string, name: string): string | null {
  const cookies = cookieHeader.split(';').map(c => c.trim());
  for (const cookie of cookies) {
    const [key, value] = cookie.split('=');
    if (key === name) {
      return decodeURIComponent(value);
    }
  }
  return null;
}

/**
 * セッションCookieを作成
 */
function createSessionCookie(signedSessionId: string): string {
  const cookieOptions: string[] = [
    `session=${signedSessionId}`,
    `Path=/`,
    `Max-Age=${Math.floor(env.SESSION_MAX_AGE / 1000)}`,
    `HttpOnly=${env.COOKIE_HTTP_ONLY}`,
    `SameSite=${env.COOKIE_SAME_SITE}`,
  ];

  if (env.COOKIE_SECURE) {
    cookieOptions.push('Secure');
  }

  if (env.COOKIE_DOMAIN) {
    cookieOptions.push(`Domain=${env.COOKIE_DOMAIN}`);
  }

  return cookieOptions.join('; ');
}

/**
 * セッション作成
 */
export async function createSession(
  sessionData: Omit<UserSession, 'createdAt' | 'lastAccessedAt'>
): Promise<{ cookie: string; sessionId: string }> {
  const sessionId = generateSessionId();
  const now = Date.now();
  
  const session: UserSession = {
    ...sessionData,
    createdAt: now,
    lastAccessedAt: now,
  };
  
  await storage.set(sessionId, session);
  
  const signedSessionId = signSessionId(sessionId);
  const cookie = createSessionCookie(signedSessionId);
  
  return { cookie, sessionId };
}

/**
 * セッション取得（セッションIDも返す）
 */
export async function getSessionWithId(request: Request): Promise<{ session: UserSession; sessionId: string } | null> {
  const cookies = request.headers.get('Cookie');
  if (!cookies) {
    return null;
  }
  
  const signedSessionId = parseCookie(cookies, 'session');
  if (!signedSessionId) {
    return null;
  }
  
  const sessionId = verifySessionId(signedSessionId);
  if (!sessionId) {
    return null;
  }
  
  const session = await storage.get(sessionId);
  if (!session) {
    return null;
  }
  
  // セッションタイムアウトチェック
  const now = Date.now();
  if (now - session.lastAccessedAt > env.SESSION_MAX_AGE) {
    await storage.delete(sessionId);
    return null;
  }
  
  // 最終アクセス時刻を更新
  session.lastAccessedAt = now;
  await storage.set(sessionId, session);
  
  return { session, sessionId };
}

/**
 * セッション取得
 */
export async function getSession(request: Request): Promise<UserSession | null> {
  const result = await getSessionWithId(request);
  return result?.session || null;
}

/**
 * セッション削除
 */
export async function deleteSession(request: Request): Promise<string | null> {
  const cookies = request.headers.get('Cookie');
  if (!cookies) {
    return null;
  }
  
  const signedSessionId = parseCookie(cookies, 'session');
  if (!signedSessionId) {
    return null;
  }
  
  const sessionId = verifySessionId(signedSessionId);
  if (!sessionId) {
    return null;
  }
  
  await storage.delete(sessionId);
  
  // Cookieを削除するためのヘッダーを返す
  const cookieOptions: string[] = [
    `session=`,
    `Path=/`,
    `Max-Age=0`,
    `HttpOnly=${env.COOKIE_HTTP_ONLY}`,
    `SameSite=${env.COOKIE_SAME_SITE}`,
  ];

  if (env.COOKIE_SECURE) {
    cookieOptions.push('Secure');
  }

  if (env.COOKIE_DOMAIN) {
    cookieOptions.push(`Domain=${env.COOKIE_DOMAIN}`);
  }

  return cookieOptions.join('; ');
}

/**
 * セッション更新
 */
export async function updateSession(
  sessionId: string,
  updates: Partial<UserSession>,
): Promise<void> {
  const session = await storage.get(sessionId);
  if (!session) {
    throw new AppError(
      ErrorCode.AUTH_INVALID_SESSION,
      'セッションが見つかりません',
      401
    );
  }
  
  const updatedSession: UserSession = {
    ...session,
    ...updates,
    lastAccessedAt: Date.now(),
  };
  
  await storage.set(sessionId, updatedSession);
}

/**
 * セッション必須のルートで利用するヘルパー
 */
export async function requireUserSession(request: Request): Promise<UserSession> {
  const session = await getSession(request);
  if (!session) {
    throw redirect("/auth/login");
  }
  return session;
}
