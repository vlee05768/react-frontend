import { useQuery } from '@tanstack/react-query';
import { getApiV1SystemMaintenanceVersion } from '@/api/generated/sdk.gen';

export function useSystemVersion() {
  const { data, isFetching } = useQuery({
    queryKey: ['system-version'],
    queryFn: () => getApiV1SystemMaintenanceVersion(),
    staleTime: Infinity, // 只抓一次即可
  });

  const backendVersion = (data?.data as any)?.data || '載入中...';
  const frontendVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '未知';

  return {
    frontendVersion,
    backendVersion,
    isFetching,
  };
}
