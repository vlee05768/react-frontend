/**
 * Current system is single-tenant, so attachment APIs use tenant 1 as a
 * centralized reference value. Remove this constant and resolve the tenant
 * from multi-tenant context when that architecture is introduced.
 */
export const SINGLE_TENANT_ATTACHMENT_ID = '1';
