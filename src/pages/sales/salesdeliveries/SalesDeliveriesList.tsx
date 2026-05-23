import PageCard from '@/components/common/PageCard';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Table, Button, Space, App, Modal, Divider, Tag } from 'antd';
import { PlusOutlined, SearchOutlined, ClearOutlined } from '@ant-design/icons';
import { useNavigate,  } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { 
  getApiV1SalesDelivery, 
  deleteApiV1SalesDeliveryByMovementNumber,
  getApiV1SalesDeliveryByMovementNumberSalesDeliveryReport
} from '@/api/generated/sdk.gen';
import DynamicSearchTags from '@/components/Form/DynamicSearchTags';
import DynamicSearchForm from '@/components/Form/DynamicSearchForm';
import { buildTableColumns, formatSorterToRules } from '@/utils/tableUtils';
import { TableActions } from '@/utils/tableActions';
import { DEFAULT_PAGE_SIZE, MODAL_WIDTH_SEARCH, MODAL_BODY_MAX_HEIGHT } from '@/constants/ui';
import { useAuthStore } from '@/stores/useAuthStore';
import type { SalesDeliveryDto } from '@/api/generated/types.gen';
import useSalesDeliveryQueryStore from './useSalesDeliveryQueryStore';
import { searchConfig, getColumns } from './SalesDeliveryConfig';
import { getApiErrorMessage } from '@/utils/apiError';
import { useUrlQuerySync } from '@/hooks/useUrlQuerySync';
import { useFileDownload } from '@/hooks/useFileDownload';

export default function SalesDeliveriesList() {
  const navigate = useNavigate();
  
  const queryClient = useQueryClient();
  const { modal, message } = App.useApp();
  const { hasPermission } = useAuthStore();
  const { params, setParams } = useSalesDeliveryQueryStore();

  const { pageNumber, pageSize, ...queryFields } = params;
  useUrlQuerySync({
    query: queryFields,
    page: pageNumber || 1,
    pageSize: pageSize || DEFAULT_PAGE_SIZE,
    setPagination: (p, s) => setParams({ pageNumber: p, pageSize: s }),
    setQuery: (q) => setParams({ ...q, pageNumber: 1 })
  });

  const searchForm = useForm({ values: params });
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['salesdeliveries', params],
    queryFn: () => getApiV1SalesDelivery({ query: params as any }),
  });

  const resData = data?.data as any;
  const listDataRaw = resData?.data?.data || resData?.data || resData;
  const listData: SalesDeliveryDto[] = Array.isArray(listDataRaw) ? listDataRaw : [];
  const total = resData?.data?.totalRecords || resData?.totalRecords || listData.length;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteApiV1SalesDeliveryByMovementNumber({ path: { movementNumber: id } }),
    onSuccess: () => {
      message.success('刪除成功');
      queryClient.invalidateQueries({ queryKey: ['salesdeliveries'] });
    },
    onError: (error) => {
      modal.error({ centered: true, title: '錯誤提示', content: `刪除失敗: ${getApiErrorMessage(error)}` });
    }
  });

  const handleTableChange = (pagination: any, _: any, sorter: any) => {
    const rules = formatSorterToRules(sorter);
    setParams({ 
      pageNumber: pagination.current, 
      pageSize: pagination.pageSize,
      SortRules: rules || undefined
    });
  };

  const { downloadFile, isDownloading } = useFileDownload();

  const columns = useMemo(() => {
    const baseColumns = getColumns();
    const actionColumn = {
      title: '操作',
      key: 'action',
      width: 120, // 檢視/列印/刪除，任一狀態下最多 2 個按鈕，設為 120
      fixed: 'right' as const,
      render: (_: any, record: SalesDeliveryDto) => {
        const canView = hasPermission('Sales.Deliveries.View');
        const canUpdate = hasPermission('Sales.Deliveries.Update');
        const canDelete = hasPermission('Sales.Deliveries.Delete');
        const canConfirm = hasPermission('Sales.Deliveries.Update'); // Assuming same perm

        return (
          <TableActions
            onView={(canView || canUpdate) ? () => navigate(`/sales/salesdeliveries/${record.documentNumber}`) : undefined}
            onPrint={(record.confirmDate && canConfirm) ? () => {
              downloadFile({
                apiFunction: () => getApiV1SalesDeliveryByMovementNumberSalesDeliveryReport({ 
                  path: { movementNumber: record.documentNumber! },
                  // @ts-ignore
                  responseType: 'blob'
                }),
                successMessage: '銷貨單報表已於新分頁開啟',
                openInNewTab: true
              });
            } : undefined}
            onDelete={(!record.confirmDate && canDelete) ? () => deleteMutation.mutate(record.documentNumber!) : undefined}
            recordName={`銷貨單 ${record.documentNumber}`}
            deleteConfirmType="modal"
            isPrinting={isDownloading}
          />
        );
      }
    };
    return buildTableColumns(baseColumns, actionColumn, params.SortRules);
  }, [hasPermission, navigate, modal, deleteMutation, isDownloading, params.SortRules]);

  return (
    <div className="p-4 pb-0 flex flex-col" style={{height: 'calc(100vh - 64px)'}}>
      <PageCard title="銷貨單管理" extra={
          <Space separator={<Divider orientation="vertical" />}>
            <Button
              type="default"
              icon={<SearchOutlined />}
              onClick={() => setIsSearchModalOpen(true)}
            >
              查詢
            </Button>
            {hasPermission('Sales.Deliveries.Create') && (
              <Button 
                type="primary" 
                icon={<PlusOutlined />} 
                onClick={() => navigate('/sales/salesdeliveries/create')}
              >
                新增資料
              </Button>
            )}
          </Space>
        }>
        <div className="mb-4 flex items-center py-3 px-4" style={{flexWrap: 'wrap', gap: '8px 12px', backgroundColor: 'var(--ant-color-fill-tertiary, #fafafa)', borderRadius: '6px', flexShrink: 0 }}>
          <div className="flex items-center" style={{ flexWrap: 'wrap' }}>
            <span className="mr-3 font-medium" style={{fontSize: '14px', color: 'var(--ant-color-text-description, #8c8c8c)'}}>目前的查詢條件:</span>
            <DynamicSearchTags
              config={searchConfig}
              params={params}
              onClose={(key) => setParams({ [key]: undefined, pageNumber: 1 })}
            />
          </div>
          {params.SortRules && (
            <>
              <div style={{ width: '1px', height: '16px', backgroundColor: '#d9d9d9', margin: '0 4px' }} />
              <div className="flex items-center" style={{ flexWrap: 'wrap' }}>
                <span className="mr-3 font-medium" style={{fontSize: '14px', color: 'var(--ant-color-text-description, #8c8c8c)'}}>排序順序:</span>
                <Space size={[0, 8]} wrap>
                  {params.SortRules.split(',').map((rule: string) => {
                    const [field, order] = rule.split(':');
                    if (!field) return null;
                    const col = getColumns().find(c => c.name === field);
                    const label = col ? col.label : field;
                    return (
                      <Tag
                        key={field}
                        closable
                        color="processing"
                        onClose={(e) => {
                          e.preventDefault();
                          const newRules = (params as any).SortRules.split(',')
                            .filter((r: string) => !r.startsWith(`${field}:`))
                            .join(',');
                          setParams({ ...params, SortRules: newRules || undefined, pageNumber: 1 });
                        }}
                      >
                        {label} {order === 'asc' ? '↑' : '↓'}
                      </Tag>
                    );
                  })}
                </Space>
              </div>
            </>
          )}
        </div>
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          

          <Table
            bordered
            columns={columns}
            dataSource={listData}
            rowKey="documentNumber"
            loading={isLoading}
            pagination={{ current: pageNumber, pageSize, total, showSizeChanger: true, showTotal: (total) => `共 ${total} 筆資料` }}
            onChange={handleTableChange}
            scroll={{ x: 'max-content', y: 300 }}
            size="middle"
          />
        </div>
      </PageCard>

      <Modal
        title={
          <div className="font-semibold pb-3 mb-2" style={{fontSize: '18px', borderBottom: '1px solid #f0f0f0'}}>
            查詢條件設定
          </div>
        }
        open={isSearchModalOpen}
        onCancel={() => setIsSearchModalOpen(false)}
        footer={
          <div className="pt-4 flex justify-end gap-2" style={{borderTop: '1px solid #f0f0f0'}}>
            <Button icon={<ClearOutlined />} onClick={() => {
              const emptyVals = Object.keys(searchForm.getValues()).reduce((acc: any, key) => { acc[key] = undefined; return acc; }, {});
              searchForm.reset(emptyVals);
              setParams({ ...emptyVals, [params.pageNumber !== undefined ? 'pageNumber' : 'page']: 1 });
            }}>
              清除條件
            </Button>
            <Button type="primary" icon={<SearchOutlined />} htmlType="submit" form="search-form">
              執行查詢
            </Button>
          </div>
        }
        width={MODAL_WIDTH_SEARCH}
        style={{ top: '10vh' }}
        styles={{
          body: {
            maxHeight: MODAL_BODY_MAX_HEIGHT,
            overflowY: 'auto',
            padding: '24px 24px 0 24px'
          }
        }}
        closeIcon={true}
      >
        <DynamicSearchForm
          config={searchConfig}
          form={searchForm}
          onSearch={(values) => {
            const formattedValues = { ...values };
            if (values.dateRange && Array.isArray(values.dateRange)) {
              formattedValues.dateRange = values.dateRange.map((d: any) => d ? d.format('YYYY-MM-DD') : undefined).filter(Boolean);
            }
            setParams({ ...params, ...formattedValues, pageNumber: 1 });
            setIsSearchModalOpen(false);
          }}
        />
      </Modal>
    </div>
  );
}
