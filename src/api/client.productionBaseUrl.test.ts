import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('production API URL defaults', () => {
  it('uses a same-origin relative URL when VITE_API_BASE_URL is not configured', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '');

    const { apiClient } = await import('./client');

    expect(apiClient.defaults.baseURL).toBe('/');
  });

  it('builds the dark logo URL through the same-origin API proxy', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '');

    const { useErpConfigStore } = await import('../stores/useErpConfigStore');

    expect(useErpConfigStore.getState().getLogoUrl('dark')).toBe(
      '/api/v1/SystemMaintenance/logo?mode=dark',
    );
  });
});
