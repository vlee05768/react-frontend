import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PermissionNode } from '@/api/generated/types.gen';
import { getApiV1AuthProfile, getApiV1AuthMyPermissions } from '@/api/generated/sdk.gen';

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
          console.error('Failed to fetch user profile:', error);
          set({ token: null, user: null, permissionTree: null }); // Force logout if profile fetch fails
        }
      },
      hasPermission: (permissionCode) => {
        const { user } = get();
        if (!user || !user.permissions) return false;
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
