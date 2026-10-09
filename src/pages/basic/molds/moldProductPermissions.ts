import type { PermissionNode } from '@/api/generated/types.gen';
import type { useAuthStore } from '@/stores/useAuthStore';

const PRODUCTS_VIEW_PERMISSION = 'BasicData.Products.View';
type MoldProductAuthState = Pick<ReturnType<typeof useAuthStore.getState>, 'user' | 'permissionTree'>;

function hasActiveView(nodes: PermissionNode[] | null | undefined): boolean {
  return nodes?.some((node) => node.key === PRODUCTS_VIEW_PERMISSION
    ? node.active === true
    : hasActiveView(node.children)) ?? false;
}

export function canViewMoldProducts({ user, permissionTree }: MoldProductAuthState): boolean {
  // 管理員仍須有已載入且明確啟用的精確節點；不推論父節點啟用規則。
  return Boolean(user && hasActiveView(permissionTree)
    && (user.roles?.includes('Admin')
      || user.permissions?.includes(PRODUCTS_VIEW_PERMISSION)));
}
