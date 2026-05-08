import type { SelectProps } from 'antd';
import { Select } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { getApiV1Material } from '@/api/generated/sdk.gen';

export const MaterialSelect: React.FC<SelectProps<any>> = (props) => {
  const { data, isLoading } = useQuery({
    queryKey: ['materials-select'],
    queryFn: async () => {
      const res = await getApiV1Material({ query: { pageSize: 1000 } });
      return res.data?.data?.data || [];
    }
  });

  return (
    <Select
      showSearch
      allowClear
      loading={isLoading}
      optionFilterProp="label"
      placeholder="搜尋原料編號或名稱"
      options={data?.map((m: any) => ({
        label: `${m.code} - ${m.name}`,
        value: m.code
      })) || []}
      {...props}
    />
  );
};
