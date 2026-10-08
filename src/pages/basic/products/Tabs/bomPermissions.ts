import type { PermissionNode } from '@/api/generated/types.gen';
import type { useAuthStore } from '@/stores/useAuthStore';

export const BOM_UPDATE_PERMISSION = 'BasicData.Products.BOM.Update';
type BomAuthState = Pick<ReturnType<typeof useAuthStore.getState>, 'user' | 'permissionTree'>;

function hasActiveUpdate(nodes: PermissionNode[] | null | undefined): boolean {
  return nodes?.some((node) =>
    node.key === BOM_UPDATE_PERMISSION
      ? node.active === true
      : hasActiveUpdate(node.children),
  ) ?? false;
}

export function canUpdateBom({ user, permissionTree }: BomAuthState): boolean {
  // 非管理員的 my-permissions 已依權限裁剪；管理員取得含停用操作的完整樹。
  // 此處不自行推論父節點啟用規則，維持與後端的權限語意一致。
  return Boolean(user && hasActiveUpdate(permissionTree)
    && (user.roles?.includes('Admin') || user.permissions?.includes(BOM_UPDATE_PERMISSION)));
}
