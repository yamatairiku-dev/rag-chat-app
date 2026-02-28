#!/usr/bin/env tsx
/**
 * 本番環境の環境変数チェックスクリプト
 * 
 * 使用方法:
 *   npx tsx scripts/check-production-env.ts
 * 
 * または、環境変数を指定して実行:
 *   NODE_ENV=production npx tsx scripts/check-production-env.ts
 */

import { z } from 'zod';

// 本番環境用の環境変数スキーマ
const productionEnvSchema = z.object({
  // App
  NODE_ENV: z.enum(['production']),
  PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)),

  // Entra ID
  ENTRA_CLIENT_ID: z.string().uuid('Invalid Entra Client ID format'),
  ENTRA_CLIENT_SECRET: z.string().min(1, 'Entra Client Secret is required'),
  ENTRA_TENANT_ID: z.string().uuid('Invalid Entra Tenant ID format'),
  ENTRA_REDIRECT_URI: z.string().url('Invalid Redirect URI').refine(
    (url) => url.startsWith('https://'),
    'Redirect URI must use HTTPS in production'
  ),
  ENTRA_POST_LOGOUT_REDIRECT_URI: z.string().url('Invalid Post Logout Redirect URI').refine(
    (url) => url.startsWith('https://'),
    'Post Logout Redirect URI must use HTTPS in production'
  ),

  // Graph API
  GRAPH_API_URL: z.string().url().default('https://graph.microsoft.com/v1.0'),
  GRAPH_API_SCOPE: z.string().default('https://graph.microsoft.com/.default'),
  GRAPH_DEPARTMENT_GROUP_PREFIX: z.string().default('^ZA[A-Za-z]\\d{3}-[A-Za-z]'),

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
  COOKIE_SECURE: z.string().transform(val => val === 'true').refine(
    (val) => val === true,
    'COOKIE_SECURE must be true in production'
  ),
  COOKIE_SAME_SITE: z.enum(['strict', 'lax', 'none']).default('lax'),
  COOKIE_HTTP_ONLY: z.string().transform(val => val === 'true').refine(
    (val) => val === true,
    'COOKIE_HTTP_ONLY must be true in production'
  ),

  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  LOG_DIRECTORY: z.string().default('./logs'),
  LOG_MAX_FILES: z.string().transform(Number).pipe(z.number().positive()).default('30'),

  // Performance
  MAX_MESSAGE_LENGTH: z.string().transform(Number).pipe(z.number().positive()).default('2000'),
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).pipe(z.number().positive()).default('60000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).pipe(z.number().positive()).default('30'),
});

interface CheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
}

function checkEnvVars(): CheckResult[] {
  const results: CheckResult[] = [];
  const env = process.env;

  // NODE_ENVの確認
  if (env.NODE_ENV !== 'production') {
    results.push({
      name: 'NODE_ENV',
      status: 'warning',
      message: `NODE_ENV is "${env.NODE_ENV}", but should be "production" for production checks`,
    });
  }

  // 環境変数のバリデーション
  try {
    productionEnvSchema.parse(env);
    results.push({
      name: 'Environment Variables',
      status: 'pass',
      message: 'All required environment variables are set and valid',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => ({
        path: err.path.join('.'),
        message: err.message,
      }));

      results.push({
        name: 'Environment Variables',
        status: 'fail',
        message: `Validation failed:\n${errors.map(e => `  - ${e.path}: ${e.message}`).join('\n')}`,
      });
    } else {
      results.push({
        name: 'Environment Variables',
        status: 'fail',
        message: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  // セキュリティチェック
  if (env.SESSION_SECRET && env.SESSION_SECRET.length < 32) {
    results.push({
      name: 'SESSION_SECRET',
      status: 'fail',
      message: 'SESSION_SECRET must be at least 32 characters long',
    });
  } else if (env.SESSION_SECRET) {
    results.push({
      name: 'SESSION_SECRET',
      status: 'pass',
      message: `SESSION_SECRET is ${env.SESSION_SECRET.length} characters long (OK)`,
    });
  }

  if (env.COOKIE_SECURE !== 'true') {
    results.push({
      name: 'COOKIE_SECURE',
      status: 'fail',
      message: 'COOKIE_SECURE must be "true" in production',
    });
  } else {
    results.push({
      name: 'COOKIE_SECURE',
      status: 'pass',
      message: 'COOKIE_SECURE is set to true (OK)',
    });
  }

  if (env.COOKIE_HTTP_ONLY !== 'true') {
    results.push({
      name: 'COOKIE_HTTP_ONLY',
      status: 'fail',
      message: 'COOKIE_HTTP_ONLY must be "true" in production',
    });
  } else {
    results.push({
      name: 'COOKIE_HTTP_ONLY',
      status: 'pass',
      message: 'COOKIE_HTTP_ONLY is set to true (OK)',
    });
  }

  // HTTPSチェック
  if (env.ENTRA_REDIRECT_URI && !env.ENTRA_REDIRECT_URI.startsWith('https://')) {
    results.push({
      name: 'ENTRA_REDIRECT_URI',
      status: 'fail',
      message: 'ENTRA_REDIRECT_URI must use HTTPS in production',
    });
  } else if (env.ENTRA_REDIRECT_URI) {
    results.push({
      name: 'ENTRA_REDIRECT_URI',
      status: 'pass',
      message: 'ENTRA_REDIRECT_URI uses HTTPS (OK)',
    });
  }

  if (env.ENTRA_POST_LOGOUT_REDIRECT_URI && !env.ENTRA_POST_LOGOUT_REDIRECT_URI.startsWith('https://')) {
    results.push({
      name: 'ENTRA_POST_LOGOUT_REDIRECT_URI',
      status: 'fail',
      message: 'ENTRA_POST_LOGOUT_REDIRECT_URI must use HTTPS in production',
    });
  } else if (env.ENTRA_POST_LOGOUT_REDIRECT_URI) {
    results.push({
      name: 'ENTRA_POST_LOGOUT_REDIRECT_URI',
      status: 'pass',
      message: 'ENTRA_POST_LOGOUT_REDIRECT_URI uses HTTPS (OK)',
    });
  }

  return results;
}

function main() {
  console.log('🔍 Production Environment Check\n');
  console.log('='.repeat(60));

  const results = checkEnvVars();

  let passCount = 0;
  let failCount = 0;
  let warningCount = 0;

  for (const result of results) {
    const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️';
    console.log(`\n${icon} ${result.name}`);
    console.log(`   ${result.message}`);

    if (result.status === 'pass') {
      passCount++;
    } else if (result.status === 'fail') {
      failCount++;
    } else {
      warningCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Pass: ${passCount}`);
  console.log(`   ❌ Fail: ${failCount}`);
  console.log(`   ⚠️  Warning: ${warningCount}`);

  if (failCount > 0) {
    console.log('\n❌ Production environment check failed!');
    console.log('   Please fix the issues above before deploying.');
    process.exit(1);
  } else if (warningCount > 0) {
    console.log('\n⚠️  Production environment check passed with warnings.');
    console.log('   Please review the warnings above.');
    process.exit(0);
  } else {
    console.log('\n✅ Production environment check passed!');
    console.log('   Ready for deployment.');
    process.exit(0);
  }
}

main();



