import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PermissionNode } from '@/api/generated/types.gen';
import { getApiV1AuthProfile, getApiV1AuthMyPermissions } from '@/api/generated/sdk.gen';
import { logger } from '@/utils/logger';

interface UserProfile {
  id?: number;
  userName?: string | null;
  name?: string | null;
  roles?: string[] | null;
  permissions?: string[] | null;
  [key: string]: any;
}

interface AuthState {
  token: string | null;
  user: UserProfile | null;
  permissionTree: PermissionNode[] | null;
  setToken: (token: string | null) => void;
  logout: () => void;
  fetchUserProfile: () => Promise<void>;
  hasPermission: (permissionCode: string) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      permissionTree: null,
      setToken: (token) => set({ token }),
      logout: () => set({ token: null, user: null, permissionTree: null }),
      fetchUserProfile: async () => {
        try {
          const [profileRes, treeRes] = await Promise.all([
            getApiV1AuthProfile(),
            getApiV1AuthMyPermissions()
          ]);
          set({ 
            user: profileRes.data?.data as UserProfile, 
            permissionTree: treeRes.data?.data as PermissionNode[] 
          });
        } catch (error) {
          logger.error('auth.profile-fetch.failed');
          set({ token: null, user: null, permissionTree: null }); // Force logout if profile fetch fails
        }
      },
      hasPermission: (permissionCode) => {
        const { user } = get();
        if (!user) return false;
        // 💡 Super Admin 剛性放行：若為 Admin 角色或 admin 帳號，直接放行，防止新模組開發階段因權限表未同步而導致 403 錯誤
        if (user.roles?.includes('Admin') || user.userName === 'admin') return true;
        if (!user.permissions) return false;
        return user.permissions.includes(permissionCode);
      }
    }),
    { 
      name: 'auth-storage',
      // Only persist the token, fetch everything else on reload to keep it fresh
      partialize: (state) => ({ token: state.token }),
    }
  )
);
