import { useState } from 'react';
import { Table, Button, message, Select, Tag, theme , App } from 'antd';
import { useQuery, useQueries, useQueryClient } from '@tanstack/react-query';
import { 
  getApiV1ProductByProductCodeMolds, 
  getApiV1ProductAvailableMolds,
  postApiV1ProductByProductCodeMoldsBatch,
  deleteApiV1ProductByProductCodeMoldsByMoldCode,
  getApiV1MoldByCode
} from '@/api/generated/sdk.gen';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';

import { productMoldTableColumns } from '../ProductConfig';
import { buildTableColumns } from '@/utils/tableUtils';

import { DictLabel } from '@/components/Form/DictLabel';

interface Props {
  productCode: string;
  isViewMode: boolean;
}

export default function ProductMolds({ productCode, isViewMode: isMasterViewMode }: Props) {
  const { modal } = App.useApp();
  const { token } = theme.useToken();
  const queryClient = useQueryClient();
  const [selectedMold, setSelectedMold] = useState<string | null>(null);

  // 取得目前已關聯的模具
    const { data: linkedMolds, isLoading: linkedMoldsLoading } = useQuery({
      queryKey: ['productMolds', productCode],
      queryFn: async () => {
        const res = await getApiV1ProductByProductCodeMolds({ path: { productCode }, query: { pageSize: 100 } });
        return res.data?.data?.data || [];
      },
      enabled: !!productCode
    });

    // 取得所有已關聯模具的詳細資料 (因為 availableMolds 可能會排除已被使用的模具)
    const moldDetailsQueries = useQueries({
      queries: (linkedMolds || []).map((m: any) => ({
        queryKey: ['moldDetails', m.moldCode],
        queryFn: async () => {
          const res = await getApiV1MoldByCode({ path: { code: m.moldCode } });
          return res.data?.data || {};
        },
        enabled: !!m.moldCode,
        staleTime: 5 * 60 * 1000, // 快取 5 分鐘
      }))
    });

    // 將所有詳情結果組成 mapping 方便查找
    const moldDetailsMap = moldDetailsQueries.reduce((acc: any, query: any, index: number) => {
      const moldCode = linkedMolds?.[index]?.moldCode;
      if (moldCode && query.data) {
        acc[moldCode] = query.data;
      }
      return acc;
    }, {});

    // 取得所有可用模具 (用於 Select 搜尋)
    const { data: allMoldsData, isLoading: moldsLoading } = useQuery({
      queryKey: ['moldsForSelect'],
      queryFn: async () => {
        const res = await getApiV1ProductAvailableMolds();
        return (res.data as any)?.data || [];
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

  const enrichedLinkedMolds = linkedMolds?.map((linked: any) => {
    const detail = moldDetailsMap[linked.moldCode] || {};
    return {
      ...detail, // 將詳情資料混入，提供類別、尺寸、形狀等欄位
      ...linked, // 保留原有的關聯狀態 (例如：isActive)
    };
  }) || [];

  const actionColumn = {
    title: '操作',
    key: 'action',
    width: 70,
    align: 'center' as const,
    render: (_: any, record: any) => isMasterViewMode ? (
      <Button type="text" danger icon={<DeleteOutlined />} size="small" onClick={() => modal.confirm({ title: '刪除確認', content: '確定要移除此關聯？此操作無法還原。', centered: true, width: 400, okButtonProps: { danger: true }, onOk: () => handleDelete(record.moldCode) })} />
    ) : null
  };

  const columns = buildTableColumns(productMoldTableColumns(), actionColumn);

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
              label: m.name?.trim() ? `${m.code} (${m.name})` : m.code,
              value: m.code,
              ...m
            }))}
            optionRender={(option) => {
              const m = option.data;
              return (
                <div className="flex flex-col py-1">
                  <div className="font-medium text-[14px]">
                    {m.name?.trim() ? `${m.code} (${m.name})` : m.code}
                  </div>
                  <div className="text-[12px] mt-1 flex flex-wrap gap-2 items-center leading-none opacity-60">
                    {(m.type || m.typeName) && (
                      <Tag bordered={false} className="m-0 leading-none py-0.5 text-blue-600 bg-blue-50">
                        <DictLabel dictKey="MOLD_TYPE" value={m.type || m.typeName} />
                      </Tag>
                    )}
                    {(m.shape || m.shapeName) && (
                      <span>
                        形狀: <DictLabel dictKey="MOLD_SHAPE" value={m.shape || m.shapeName} />
                      </span>
                    )}
                    {(m.dimensionLMm != null || m.dimensionWMm != null || m.dimensionHMm != null) ? (
                      <span>
                        尺寸: {m.dimensionLMm || 0}x{m.dimensionWMm || 0}x{m.dimensionHMm || 0}
                      </span>
                    ) : null}
                    {m.supplierName && <span>供應商: {m.supplierName}</span>}
                  </div>
                </div>
              );
            }}
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
        dataSource={enrichedLinkedMolds}
        rowKey="moldCode"
        size="small"
        loading={linkedMoldsLoading || moldsLoading || moldDetailsQueries.some(q => q.isLoading)}
        pagination={false}
        scroll={{ x: 'max-content' }}
      />
    </div>
  );
}
