/**
 * Microsoft Graph ユーザー情報
 * 
 * 実際に使用するフィールドのみを定義（$selectで取得するフィールド）
 */
export interface GraphUser {
  /** User Object ID */
  id: string;
  
  /** ユーザープリンシパル名 (例: user@company.com) */
  userPrincipalName: string;
  
  /** 表示名 (例: 田中 太郎) */
  displayName: string;
  
  /** メールアドレス */
  mail: string;
  
  // 以下のフィールドは使用していないため、$selectで取得しない
  // 型定義は後方互換性のため残しているが、実際のAPIレスポンスには含まれない
  /** 名 */
  givenName?: string;
  
  /** 姓 */
  surname?: string;
  
  /** 役職 */
  jobTitle?: string;
  
  /** 部署名 */
  department?: string;
  
  /** オフィス所在地 */
  officeLocation?: string;
  
  /** 携帯電話番号 */
  mobilePhone?: string;
  
  /** 業務用電話番号 */
  businessPhones?: string[];
}

/**
 * Microsoft Graph グループ情報
 * 
 * 実際に使用するフィールドのみを定義（$selectで取得するフィールド）
 */
export interface GraphGroup {
  '@odata.type'?: '#microsoft.graph.group';
  
  /** Group Object ID */
  id: string;
  
  /** グループ名（表示名。形式は任意） */
  displayName: string;
  
  // 以下のフィールドは使用していないため、$selectで取得しない
  // 型定義は後方互換性のため残しているが、実際のAPIレスポンスには含まれない
  /** グループの説明 */
  description?: string;
  
  /** グループメールアドレス */
  mail?: string;
}

/**
 * グループメンバーシップレスポンス
 */
export interface MemberOfResponse {
  '@odata.context': string;
  value: GraphGroup[];
}

/**
 * 所属部署情報
 */
export interface DepartmentInfo {
  /** 所属コード（グループの Object ID） */
  code: string;
  
  /** 部署名（グループの表示名） */
  name: string;
  
  /** グループID */
  groupId: string;
  
  /** グループ名（表示名） */
  groupName: string;
}

