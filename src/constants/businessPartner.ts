/**
 * 商業夥伴角色類型常數定義
 */
export const BusinessPartnerRoleTypes = {
  /** 客戶 */
  CUSTOMER: 'CUSTOMER',
  /** 原料供應商 */
  MATERIAL_SUPPLIER: 'MATERIAL_SUPPLIER',
  /** 模具商 */
  TOOLING_SUPPLIER: 'TOOLING_SUPPLIER',
  /** 委外加工商 */
  OUTSOURCE_VENDOR: 'OUTSOURCE_VENDOR',
} as const;

export type BusinessPartnerRoleType = typeof BusinessPartnerRoleTypes[keyof typeof BusinessPartnerRoleTypes];
