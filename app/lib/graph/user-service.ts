// app/lib/graph/user-service.ts
import { createGraphClient } from './graph-client';
import type { GraphUser, DepartmentInfo, MemberOfResponse } from '~/types/graph';
import { env } from '~/lib/utils/env';
import { AppError, ErrorCode } from '~/types/error';

/**
 * ユーザー情報取得
 */
export async function getUserInfo(accessToken: string): Promise<GraphUser> {
  try {
    const client = createGraphClient(accessToken);
    const user = await client.api('/me').get() as GraphUser;
    
    if (!user || !user.id) {
      throw new AppError(
        ErrorCode.GRAPH_USER_NOT_FOUND,
        'ユーザー情報の取得に失敗しました',
        404
      );
    }
    
    return user;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      ErrorCode.GRAPH_API_ERROR,
      `ユーザー情報の取得に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500
    );
  }
}

/**
 * 所属部署情報取得（正規表現にマッチするすべてのグループを配列で返す）
 */
export async function getUserDepartment(
  accessToken: string
): Promise<DepartmentInfo[]> {
  try {
    const client = createGraphClient(accessToken);
    console.log("[所属部署取得] Graph API呼び出し: /me/memberOf");
    const response = await client.api('/me/memberOf').get() as MemberOfResponse;

    // デバッグ: 実際の応答をログに出力
    console.log("[所属部署取得] Graph API応答:", JSON.stringify(response, null, 2));
    console.log("[所属部署取得] 取得したグループ数:", response.value?.length || 0);

    if (response.value && response.value.length > 0) {
      console.log("[所属部署取得] グループ一覧:");
      response.value.forEach((group, index) => {
        console.log(`  [${index + 1}] ID: ${group.id}, 表示名: ${group.displayName || '(なし)'}`);
      });
    } else {
      console.log("[所属部署取得] グループが見つかりませんでした");
    }

    const pattern = env.GRAPH_DEPARTMENT_GROUP_PREFIX;
    const departmentRegex = new RegExp(pattern);
    console.log("[所属部署取得] 検索パターン（正規表現）:", pattern);

    const departmentGroups = (response.value ?? []).filter(
      (group) => group.displayName != null && departmentRegex.test(group.displayName)
    );

    if (departmentGroups.length === 0) {
      console.log("[所属部署取得] 正規表現に一致するグループが見つかりませんでした");
      console.log("[所属部署取得] 検索対象のグループ名:", response.value?.map(g => g.displayName).join(', ') || '(なし)');
      return [];
    }

    const result = departmentGroups.map((group) => ({
      code: group.id,
      name: group.displayName,
      groupId: group.id,
      groupName: group.displayName,
    }));

    console.log("[所属部署取得] 抽出結果（件数:", result.length, "):", result);
    return result;
  } catch (error) {
    console.error("[所属部署取得] エラー発生:", error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      ErrorCode.GRAPH_API_ERROR,
      `所属部署情報の取得に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500
    );
  }
}

