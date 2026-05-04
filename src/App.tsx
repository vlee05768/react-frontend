import { ConfigProvider, theme } from 'antd';
import zhTW from 'antd/locale/zh_TW';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';

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
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider
        locale={zhTW}
        theme={{
          algorithm: theme.darkAlgorithm,
          token: {
            colorPrimary: '#1668dc',
            colorBgBase: '#141414',
            borderRadius: 6,
          },
          components: {
            DatePicker: {
              colorIcon: 'rgba(255, 255, 255, 0.65)',
              colorIconHover: 'rgba(255, 255, 255, 0.85)',
              colorTextDisabled: 'rgba(255, 255, 255, 0.25)',
            },
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
      </ConfigProvider>
    </QueryClientProvider>
  );
}
