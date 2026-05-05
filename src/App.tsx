import { ConfigProvider, theme, Spin } from 'antd';
import { useLoadingStore } from './stores/useLoadingStore';
import zhTW from 'antd/locale/zh_TW';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { useThemeStore } from './stores/useThemeStore';

// 建立 React Query Client，統一全域快取設定
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 分鐘快取
    },
  },
});

export default function App() {
  const { mode } = useThemeStore();
  const requestCount = useLoadingStore((state) => state.requestCount);
  const loadingMessage = useLoadingStore((state) => state.loadingMessage);
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider
        locale={zhTW}
        theme={{
          algorithm: mode === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
          token: {
            colorPrimary: '#1668dc',
            colorBgBase: mode === 'dark' ? '#141414' : '#ffffff',
            borderRadius: 6,
          },
          components: {
            Table: {
              // 高資訊密度列表設計
              padding: 8,
              paddingMD: 8,
              paddingSM: 8,
            },
            Form: {
              marginLG: 16,
            }
          }
        }}
      >
        <RouterProvider router={router} />
        {requestCount > 0 && <Spin fullscreen size="large" description={loadingMessage} />}
      </ConfigProvider>
    </QueryClientProvider>
  );
}
