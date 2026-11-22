import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import MainLayout from './MainLayout';
import { useAuthStore } from '@/stores/useAuthStore';

vi.mock('@/stores/useThemeStore', () => ({
  useThemeStore: () => ({ mode: 'light', toggleTheme: vi.fn() }),
}));

vi.mock('@/stores/useErpConfigStore', () => ({
  useErpConfigStore: (selector: any) =>
    selector({
      getCompanyName: () => '東富 ERP',
      getLogoUrl: () => null,
    }),
}));

vi.mock('@/hooks/useSystemVersion', () => ({
  useSystemVersion: () => ({ frontendVersion: '1.0.0', backendVersion: '1.0.0' }),
}));

describe('MainLayout Deletion Audit Menu Permission', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({
      matches: false,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })));
    vi.stubGlobal('ResizeObserver', class {
      observe() {}
      unobserve() {}
      disconnect() {}
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    useAuthStore.setState({ token: null, user: null, permissionTree: null });
  });

  const baseSystemTree = [
    {
      key: 'System',
      title: '系統設定',
      active: true,
      children: [
        { key: 'System.Users', title: '使用者管理', active: true },
        { key: 'System.Roles', title: '角色管理', active: true },
      ],
    },
  ];

  it('無 audit:read 權限時，展開系統設定選單不應包含「刪除稽核查詢」', async () => {
    const user = userEvent.setup();
    useAuthStore.setState({
      token: 'fake-token',
      user: {
        id: 2,
        name: '一般操作員',
        roles: ['Operator'],
        permissions: ['System.Users.View'],
      },
      permissionTree: baseSystemTree as any,
    });

    render(
      <MemoryRouter initialEntries={['/']}>
        <MainLayout />
      </MemoryRouter>
    );

    // 點擊「系統設定」以展開子選單
    const systemSubmenu = await screen.findByText('系統設定');
    await user.click(systemSubmenu);

    await waitFor(() => {
      expect(screen.getByText('使用者管理')).toBeInTheDocument();
      expect(screen.queryByText('刪除稽核查詢')).not.toBeInTheDocument();
    });
  });

  it('擁有 audit:read 權限時，訪問 /system/deletion-audits 應自動展開並顯示「刪除稽核查詢」', async () => {
    useAuthStore.setState({
      token: 'fake-token',
      user: {
        id: 1,
        name: '審計人員',
        roles: ['Auditor'],
        permissions: ['audit:read', 'System.Users.View'],
      },
      permissionTree: baseSystemTree as any,
    });

    render(
      <MemoryRouter initialEntries={['/system/deletion-audits']}>
        <MainLayout />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('刪除稽核查詢')).toBeInTheDocument();
    });
  });
});
