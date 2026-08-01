// app/lib/graph/user-service.ts
import { createGraphClient, withGraphRetry } from './graph-client';
import type { GraphUser, DepartmentInfo, MemberOfResponse } from '~/types/graph';
import { env } from '~/lib/utils/env';
import { AppError, ErrorCode } from '~/types/error';
import { logger } from '~/lib/logging/logger';

/**
 * ユーザー情報取得
 *
 * 必要なフィールドのみを取得してパフォーマンスとセキュリティを向上
 */
export async function getUserInfo(accessToken: string): Promise<GraphUser> {
  try {
    const client = createGraphClient(accessToken);
    // 実際に使用するフィールドのみを取得: id, mail, userPrincipalName, displayName
    const user = await withGraphRetry(() =>
      client
        .api('/me')
        .select(['id', 'mail', 'userPrincipalName', 'displayName'])
        .get(),
    ) as GraphUser;

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
    logger.error('[GraphClient] ユーザー情報取得エラー', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw new AppError(
      ErrorCode.GRAPH_API_ERROR,
      `ユーザー情報の取得に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500
    );
  }
}

/**
 * 所属部署情報取得（正規表現にマッチするすべてのグループを配列で返す）
 * 
 * 必要なフィールドのみを取得してパフォーマンスとセキュリティを向上
 */
export async function getUserDepartment(
  accessToken: string
): Promise<DepartmentInfo[]> {
  try {
    const client = createGraphClient(accessToken);
    logger.debug("[所属部署取得] Graph API呼び出し: /me/memberOf");
    // 実際に使用するフィールドのみを取得: id, displayName
    const response = await withGraphRetry(() =>
      client
        .api('/me/memberOf')
        .select(['id', 'displayName'])
        .get(),
    ) as MemberOfResponse;

    logger.debug("[所属部署取得] Graph API応答", {
      groupCount: response.value?.length ?? 0,
      groups: response.value?.map((group) => ({
        id: group.id,
        displayName: group.displayName ?? '(なし)',
      })),
    });

    const pattern = env.GRAPH_DEPARTMENT_GROUP_PREFIX;
    const departmentRegex = new RegExp(pattern);

    const departmentGroups = (response.value ?? []).filter(
      (group) => group.displayName != null && departmentRegex.test(group.displayName)
    );

    if (departmentGroups.length === 0) {
      logger.debug("[所属部署取得] 検索パターンに一致するグループが見つかりませんでした", {
        pattern,
        candidateNames: response.value?.map((g) => g.displayName),
      });
      return [];
    }

    const result = departmentGroups.map((group) => ({
      code: group.id,
      name: group.displayName,
      groupId: group.id,
      groupName: group.displayName,
    }));

    logger.debug("[所属部署取得] 抽出結果", { count: result.length });
    return result;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error("[所属部署取得] エラー発生", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw new AppError(
      ErrorCode.GRAPH_API_ERROR,
      `所属部署情報の取得に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500
    );
  }
}

