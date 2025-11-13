/**
 * Microsoft Graph ユーザー情報
 */
export interface GraphUser {
  /** User Object ID */
  id: string;
  
  /** ユーザープリンシパル名 (例: user@company.com) */
  userPrincipalName: string;
  
  /** 表示名 (例: 田中 太郎) */
  displayName: string;
  
  /** 名 */
  givenName: string;
  
  /** 姓 */
  surname: string;
  
  /** メールアドレス */
  mail: string;
  
  /** 役職 */
  jobTitle?: string;
  
  /** 部署名 */
  department?: string;
  
  /** オフィス所在地 */
  officeLocation?: string;
  
  /** 携帯電話番号 */
  mobilePhone?: string;
  
  /** 業務用電話番号 */
  businessPhones: string[];
}

/**
 * Microsoft Graph グループ情報
 */
export interface GraphGroup {
  '@odata.type': '#microsoft.graph.group';
  
  /** Group Object ID */
  id: string;
  
  /** グループ名 (例: DEPT_001_営業部) */
  displayName: string;
  
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
  /** 所属コード (例: 001) */
  code: string;
  
  /** 部署名 (例: 営業部) */
  name: string;
  
  /** グループID */
  groupId: string;
  
  /** グループ名 (例: DEPT_001_営業部) */
  groupName: string;
}

