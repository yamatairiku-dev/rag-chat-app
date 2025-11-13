#!/usr/bin/env node
/**
 * Graph API接続テストスクリプト
 * 
 * このスクリプトは以下のことをテストします:
 * 1. MSALを使用したアクセストークンの取得
 * 2. Graph APIへの接続
 * 3. ユーザー情報の取得 (/me)
 * 4. グループ情報の取得 (/me/memberOf)
 */

import { ConfidentialClientApplication } from '@azure/msal-node';
import { Client } from '@microsoft/microsoft-graph-client';
import { config as dotenvConfig } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// .envファイルを読み込む
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenvConfig({ path: join(__dirname, '.env') });

// 環境変数の確認
const requiredEnvVars = [
  'ENTRA_CLIENT_ID',
  'ENTRA_CLIENT_SECRET',
  'ENTRA_TENANT_ID',
  'GRAPH_API_URL',
  'GRAPH_API_SCOPE',
];

const missingVars = requiredEnvVars.filter(
  (varName) => !process.env[varName]
);

if (missingVars.length > 0) {
  console.error('❌ 以下の環境変数が設定されていません:');
  missingVars.forEach((varName) => console.error(`   - ${varName}`));
  process.exit(1);
}

const tenantId = process.env.ENTRA_TENANT_ID!;
const authority = process.env.ENTRA_AUTHORITY 
  ? `${process.env.ENTRA_AUTHORITY}/${tenantId}`
  : `https://login.microsoftonline.com/${tenantId}`;

const config = {
  auth: {
    clientId: process.env.ENTRA_CLIENT_ID!,
    clientSecret: process.env.ENTRA_CLIENT_SECRET!,
    authority: authority,
  },
};

const graphApiUrl = process.env.GRAPH_API_URL || 'https://graph.microsoft.com/v1.0';
const graphApiScope = process.env.GRAPH_API_SCOPE || 'https://graph.microsoft.com/.default';
const deptPrefix = process.env.GRAPH_DEPARTMENT_GROUP_PREFIX || 'DEPT_';

/**
 * Graph APIクライアントを作成
 */
function createGraphClient(accessToken: string): Client {
  return Client.init({
    authProvider: (done) => {
      done(null, accessToken);
    },
  });
}

/**
 * アクセストークンを取得（クライアントクレデンシャルフロー）
 * 
 * 注意: この方法はアプリケーションの権限が必要です。
 * ユーザー認証が必要な場合は、Authorization Code Flowを使用してください。
 */
async function getAccessToken(): Promise<string> {
  console.log('🔐 アクセストークンを取得中...');
  
  const cca = new ConfidentialClientApplication(config);
  
  try {
    const response = await cca.acquireTokenByClientCredential({
      scopes: [graphApiScope],
    });

    if (!response || !response.accessToken) {
      throw new Error('アクセストークンの取得に失敗しました');
    }

    console.log('✅ アクセストークンを取得しました');
    return response.accessToken;
  } catch (error: any) {
    console.error('❌ アクセストークンの取得に失敗しました:');
    if (error.errorCode) {
      console.error(`   エラーコード: ${error.errorCode}`);
      console.error(`   エラーメッセージ: ${error.errorMessage}`);
    } else {
      console.error(`   エラー: ${error.message || error}`);
    }
    throw error;
  }
}

/**
 * ユーザー情報を取得（/me）
 * 
 * 注意: このエンドポイントはユーザー認証が必要です。
 * クライアントクレデンシャルフローでは使用できません。
 */
async function testGetUserInfo(accessToken: string, userId?: string): Promise<void> {
  console.log('\n📋 ユーザー情報を取得中...');
  
  const client = createGraphClient(accessToken);
  
  try {
    // クライアントクレデンシャルフローの場合は、特定のユーザーIDを指定する必要があります
    if (userId) {
      const user = await client.api(`/users/${userId}`).get();
      console.log('✅ ユーザー情報を取得しました:');
      console.log(JSON.stringify(user, null, 2));
    } else {
      // /meエンドポイントを試す（ユーザー認証が必要）
      try {
        const user = await client.api('/me').get();
        console.log('✅ ユーザー情報を取得しました:');
        console.log(JSON.stringify(user, null, 2));
      } catch (error: any) {
        console.log('⚠️  /meエンドポイントはユーザー認証が必要です');
        console.log('   クライアントクレデンシャルフローでは使用できません');
        console.log('   代わりに /users/{userId} を使用してください');
      }
    }
  } catch (error: any) {
    console.error('❌ ユーザー情報の取得に失敗しました:');
    console.error(`   エラー: ${error.message || error}`);
    if (error.statusCode) {
      console.error(`   HTTPステータス: ${error.statusCode}`);
    }
  }
}

/**
 * グループ情報を取得
 */
async function testGetGroups(accessToken: string): Promise<void> {
  console.log('\n👥 グループ情報を取得中...');
  
  const client = createGraphClient(accessToken);
  
  try {
    // すべてのグループを取得
    const groups = await client.api('/groups').get();
    
    console.log(`✅ ${groups.value?.length || 0}個のグループを取得しました`);
    
    if (groups.value && groups.value.length > 0) {
      console.log('\n📊 グループ一覧:');
      groups.value.slice(0, 10).forEach((group: any, index: number) => {
        console.log(`   ${index + 1}. ${group.displayName || group.id}`);
        if (group.displayName?.startsWith(deptPrefix)) {
          const parts = group.displayName.split('_');
          if (parts.length >= 2) {
            console.log(`      → 所属コード: ${parts[1]}`);
          }
        }
      });
      
      if (groups.value.length > 10) {
        console.log(`   ... 他 ${groups.value.length - 10}個のグループ`);
      }
    }
  } catch (error: any) {
    console.error('❌ グループ情報の取得に失敗しました:');
    console.error(`   エラー: ${error.message || error}`);
    if (error.statusCode) {
      console.error(`   HTTPステータス: ${error.statusCode}`);
    }
    if (error.code) {
      console.error(`   エラーコード: ${error.code}`);
    }
  }
}

/**
 * Graph API接続テスト
 */
async function testGraphApiConnection(accessToken: string): Promise<void> {
  console.log('\n🔌 Graph API接続をテスト中...');
  
  const client = createGraphClient(accessToken);
  
  try {
    // シンプルなAPI呼び出しで接続をテスト
    const servicePrincipal = await client.api('/servicePrincipals').filter(`appId eq '${config.auth.clientId}'`).get();
    
    if (servicePrincipal.value && servicePrincipal.value.length > 0) {
      console.log('✅ Graph APIへの接続が成功しました');
      console.log(`   サービスプリンシパルID: ${servicePrincipal.value[0].id}`);
    } else {
      console.log('⚠️  サービスプリンシパルが見つかりませんでした');
    }
  } catch (error: any) {
    console.error('❌ Graph API接続テストに失敗しました:');
    console.error(`   エラー: ${error.message || error}`);
    if (error.statusCode) {
      console.error(`   HTTPステータス: ${error.statusCode}`);
    }
  }
}

/**
 * メイン関数
 */
async function main() {
  console.log('================================');
  console.log('Graph API接続テスト');
  console.log('================================');
  console.log(`テナントID: ${tenantId}`);
  console.log(`クライアントID: ${config.auth.clientId}`);
  console.log(`Graph API URL: ${graphApiUrl}`);
  console.log(`スコープ: ${graphApiScope}`);
  console.log(`部署グループプレフィックス: ${deptPrefix}`);
  console.log('================================\n');

  try {
    // 1. アクセストークンを取得
    const accessToken = await getAccessToken();
    
    // 2. Graph API接続テスト
    await testGraphApiConnection(accessToken);
    
    // 3. グループ情報を取得
    await testGetGroups(accessToken);
    
    // 4. ユーザー情報の取得を試す（クライアントクレデンシャルフローでは制限あり）
    // 特定のユーザーIDが提供されている場合は使用
    const userId = process.env.TEST_USER_ID;
    await testGetUserInfo(accessToken, userId);
    
    console.log('\n================================');
    console.log('✅ テスト完了');
    console.log('================================');
    
  } catch (error: any) {
    console.error('\n================================');
    console.error('❌ テスト失敗');
    console.error('================================');
    console.error(`エラー: ${error.message || error}`);
    process.exit(1);
  }
}

// スクリプトを実行
main().catch((error) => {
  console.error('予期しないエラー:', error);
  process.exit(1);
});
