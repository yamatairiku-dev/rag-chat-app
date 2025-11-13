// app/lib/auth/entra-client.ts
import { ConfidentialClientApplication, type AuthenticationResult } from '@azure/msal-node';
import { env } from '~/lib/utils/env';
import { AppError, ErrorCode } from '~/types/error';

// MSAL設定
const msalConfig = {
  auth: {
    clientId: env.ENTRA_CLIENT_ID,
    authority: `${env.ENTRA_AUTHORITY}/${env.ENTRA_TENANT_ID}`,
    clientSecret: env.ENTRA_CLIENT_SECRET,
  },
};

const msalClient = new ConfidentialClientApplication(msalConfig);

/**
 * OAuth2認証URL生成
 */
export async function getAuthorizationUrl(): Promise<string> {
  try {
    const authCodeUrlParameters = {
      scopes: ['User.Read', 'GroupMember.Read.All'],
      redirectUri: env.ENTRA_REDIRECT_URI,
    };

    const authUrl = await msalClient.getAuthCodeUrl(authCodeUrlParameters);
    return authUrl;
  } catch (error) {
    throw new AppError(
      ErrorCode.AUTH_INVALID_TOKEN,
      `認証URLの生成に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500
    );
  }
}

/**
 * Authorization Code → Tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<{
  accessToken: string;
  refreshToken: string | undefined;
  idToken: string | undefined;
  expiresIn: number;
}> {
  try {
    const tokenRequest = {
      code,
      scopes: ['User.Read', 'GroupMember.Read.All'],
      redirectUri: env.ENTRA_REDIRECT_URI,
    };

    const response: AuthenticationResult | null = await msalClient.acquireTokenByCode(tokenRequest);

    if (!response || !response.accessToken) {
      throw new AppError(
        ErrorCode.AUTH_INVALID_TOKEN,
        'トークンの取得に失敗しました',
        401
      );
    }

    return {
      accessToken: response.accessToken!,
      refreshToken: (response as any).refreshToken as string | undefined,
      idToken: response.idToken,
      expiresIn: response.expiresOn 
        ? Math.floor((response.expiresOn.getTime() - Date.now()) / 1000) 
        : 3600,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      ErrorCode.AUTH_INVALID_TOKEN,
      `トークン交換に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`,
      401
    );
  }
}

/**
 * リフレッシュトークンで新しいアクセストークン取得
 */
export async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string | undefined;
  expiresIn: number;
}> {
  try {
    const tokenRequest = {
      refreshToken,
      scopes: ['User.Read', 'GroupMember.Read.All'],
    };

    const response: AuthenticationResult | null = await msalClient.acquireTokenByRefreshToken(tokenRequest);

    if (!response || !response.accessToken) {
      throw new AppError(
        ErrorCode.AUTH_TOKEN_EXPIRED,
        'トークンのリフレッシュに失敗しました',
        401
      );
    }

    return {
      accessToken: response.accessToken!,
      refreshToken: (response as any).refreshToken as string | undefined,
      expiresIn: response.expiresOn 
        ? Math.floor((response.expiresOn.getTime() - Date.now()) / 1000) 
        : 3600,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      ErrorCode.AUTH_TOKEN_EXPIRED,
      `トークンリフレッシュに失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`,
      401
    );
  }
}

