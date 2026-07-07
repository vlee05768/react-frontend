import { ConfigProvider, theme, Spin, App as AntdApp } from 'antd';
import { useLoadingStore } from './stores/useLoadingStore';
import zhTW from 'antd/locale/zh_TW';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { useThemeStore } from './stores/useThemeStore';
import { useEffect } from 'react';
import { DevBanner } from './components/DevBanner';

// 💡 智慧快取控制：開發模式下徹底關閉快取、視窗聚焦即刷，正式模式下開啟 5 分鐘快取提速
const isDev = import.meta.env.DEV;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: isDev ? true : false, // 開發模式：視窗切換自動更新；正式模式：避免頻繁重新拉取
      staleTime: isDev ? 0 : 5 * 60 * 1000,       // 開發模式：一秒都不快取（立即使之過期）；正式模式：快取 5 分鐘
      gcTime: isDev ? 0 : 5 * 60 * 1000,          // 開發模式：關閉即銷毀記憶體快取；正式模式：快取 5 分鐘
    },
  },
});

export default function App() {
  const { mode } = useThemeStore();
  const requestCount = useLoadingStore((state) => state.requestCount);
  const loadingMessage = useLoadingStore((state) => state.loadingMessage);

  useEffect(() => {
    if (mode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [mode]);

  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider
        locale={zhTW}
        theme={{
          cssVar: true as any,
          algorithm: mode === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
          token: {
            colorPrimary: '#1668dc',
            colorBgBase: mode === 'dark' ? '#141414' : '#ffffff',
            borderRadius: 6,
            // 增強 Disable 狀態的對比度，讓表單文字更清晰，同時背景保持明顯的置灰
            colorTextDisabled: mode === 'dark' ? 'rgba(255, 255, 255, 0.65)' : 'rgba(0, 0, 0, 0.6)',
            colorBgContainerDisabled: mode === 'dark' ? '#303030' : '#f0f0f0',
          },
          components: {

            Menu: {
              fontSize: 16,
              itemHeight: 48,
              iconSize: 18,
              collapsedIconSize: 20,
            },
            Button: {
              // 讓所有 disabled 按鈕的背景變成明顯的灰色，文字也調整為對應的深灰色
              colorBgContainerDisabled: mode === 'dark' ? '#434343' : '#cccccc',
              colorTextDisabled: mode === 'dark' ? '#8c8c8c' : '#666666',
              borderColorDisabled: mode === 'dark' ? '#434343' : '#cccccc',
            },
            Table: {
              // 高資訊密度列表設計
              padding: 8,
              paddingMD: 8,
              paddingSM: 8,
            },
            Form: {
              marginLG: 16,
              labelColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.85)',
            }
          }
        }}
      >
        <DevBanner />
        <AntdApp message={{ top: 80 }}>
          <RouterProvider router={router} />
          {requestCount > 0 && <Spin fullscreen size="large" description={loadingMessage} />}
        </AntdApp>
      </ConfigProvider>
    </QueryClientProvider>
  );
}
