import '@testing-library/jest-dom';

// テスト用の環境変数を設定（適切な形式で設定）
process.env.PORT = process.env.PORT || '3000';
process.env.ENTRA_CLIENT_ID = process.env.ENTRA_CLIENT_ID || '00000000-0000-0000-0000-000000000000';
process.env.ENTRA_CLIENT_SECRET = process.env.ENTRA_CLIENT_SECRET || 'test-client-secret';
process.env.ENTRA_TENANT_ID = process.env.ENTRA_TENANT_ID || '00000000-0000-0000-0000-000000000001';
process.env.ENTRA_REDIRECT_URI = process.env.ENTRA_REDIRECT_URI || 'http://localhost:3000/auth';
process.env.ENTRA_POST_LOGOUT_REDIRECT_URI = process.env.ENTRA_POST_LOGOUT_REDIRECT_URI || 'http://localhost:3000';
process.env.DIFY_API_URL = process.env.DIFY_API_URL || 'https://api.dify.ai';
process.env.DIFY_API_KEY = process.env.DIFY_API_KEY || 'app-test-api-key-for-testing';
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'test-session-secret-at-least-32-chars';
process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'info';
process.env.LOG_DIRECTORY = process.env.LOG_DIRECTORY || './logs';
process.env.LOG_MAX_FILES = process.env.LOG_MAX_FILES || '5';
process.env.NODE_ENV = process.env.NODE_ENV || 'test';

