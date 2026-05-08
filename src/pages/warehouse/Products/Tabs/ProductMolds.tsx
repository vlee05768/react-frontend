import { useState } from 'react';
import { Table, Button, message, Select, Popconfirm, Tag, theme } from 'antd';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  getApiV1ProductByProductCodeMolds, 
  getApiV1Mold,
  postApiV1ProductByProductCodeMoldsBatch,
  deleteApiV1ProductByProductCodeMoldsByMoldCode
} from '@/api/generated/sdk.gen';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';

interface Props {
  productCode: string;
  isViewMode: boolean;
}

export default function ProductMolds({ productCode, isViewMode: isMasterViewMode }: Props) {
  const { token } = theme.useToken();
  const queryClient = useQueryClient();
  const [selectedMold, setSelectedMold] = useState<string | null>(null);

  // 取得目前已關聯的模具
  const { data: linkedMolds, isLoading } = useQuery({
    queryKey: ['productMolds', productCode],
    queryFn: async () => {
      const res = await getApiV1ProductByProductCodeMolds({ path: { productCode } });
      return res.data?.data?.data || [];
    },
    enabled: !!productCode
  });

  // 取得所有可用模具 (用於 Select 搜尋)
  const { data: allMoldsData, isLoading: moldsLoading } = useQuery({
    queryKey: ['moldsForSelect'],
    queryFn: async () => {
      // 假設可用 getApiV1Mold 取得模具清單 (視實際 API 狀況調整，也可以用 autocomplete)
      const res = await getApiV1Mold({ query: { pageSize: 1000 } });
      return (res.data as any)?.data?.data || [];
    }
  });

  const handleAdd = async () => {
    if (!selectedMold) {
      message.warning('請先選擇模具');
      return;
    }
    try {
      await postApiV1ProductByProductCodeMoldsBatch({
        path: { productCode },
        body: [{ moldCode: selectedMold }]
      });
      message.success('新增模具關聯成功');
      setSelectedMold(null);
      queryClient.invalidateQueries({ queryKey: ['productMolds', productCode] });
    } catch (error: any) {
      message.error(error?.response?.data?.message || '新增失敗');
    }
  };

  const handleDelete = async (moldCode: string) => {
    try {
      await deleteApiV1ProductByProductCodeMoldsByMoldCode({
        path: { productCode, moldCode }
      });
      message.success('移除模具關聯成功');
      queryClient.invalidateQueries({ queryKey: ['productMolds', productCode] });
    } catch (error: any) {
      message.error(error?.response?.data?.message || '移除失敗');
    }
  };

  // 過濾掉已經關聯的模具
  const linkedMoldCodes = linkedMolds?.map((m: any) => m.moldCode) || [];
  const availableMolds = allMoldsData?.filter((m: any) => !linkedMoldCodes.includes(m.code)) || [];

  const columns = [
    { title: '模具編號', dataIndex: 'moldCode', key: 'moldCode', width: 150 },
    { title: '模具名稱', dataIndex: 'moldName', key: 'moldName', width: 200 },
    { 
      title: '狀態', 
      dataIndex: 'isActive', 
      key: 'isActive', 
      width: 100,
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'success' : 'error'}>
          {isActive ? '啟用' : '停用'}
        </Tag>
      )
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: any, record: any) => isMasterViewMode ? (
        <Popconfirm 
          title="確定要移除此關聯？" 
          onConfirm={() => handleDelete(record.moldCode)}
        >
          <Button type="text" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ) : null
    }
  ];

  return (
    <div className="flex flex-col gap-4">
      {isMasterViewMode && (
        <div 
          className="flex items-center gap-2 p-4 rounded-md border"
          style={{ 
            backgroundColor: token.colorFillAlter, 
            borderColor: token.colorBorderSecondary 
          }}
        >
          <span className="font-medium" style={{ color: token.colorText }}>快速新增模具：</span>
          <Select
            showSearch
            allowClear
            className="flex-1"
            placeholder="搜尋模具編號或名稱"
            optionFilterProp="label"
            value={selectedMold}
            onChange={setSelectedMold}
            loading={moldsLoading}
            options={availableMolds.map((m: any) => ({
              label: `${m.code} - ${m.name}`,
              value: m.code
            }))}
          />
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={handleAdd}
            disabled={!selectedMold}
          >
            新增關聯
          </Button>
        </div>
      )}

      <Table
        columns={columns}
        dataSource={linkedMolds || []}
        rowKey="moldCode"
        size="small"
        loading={isLoading}
        pagination={false}
      />
    </div>
  );
}
