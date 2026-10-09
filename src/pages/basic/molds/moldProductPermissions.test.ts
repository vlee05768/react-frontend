import { describe, expect, it } from 'vitest';
import { canViewMoldProducts } from './moldProductPermissions';

describe('模具關聯產品有效權限', () => {
  it('帳號名稱 admin 不等同後端 Admin 角色', () => {
    expect(canViewMoldProducts({
      user: { userName: 'admin', roles: [], permissions: [] },
      permissionTree: [{ key: 'BasicData.Products.View', active: true }],
    })).toBe(false);
  });
});
