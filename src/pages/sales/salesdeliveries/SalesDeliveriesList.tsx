import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Card, Table, Button, Space, Tooltip, App, Modal, Divider } from 'antd';
import { EyeOutlined, PlusOutlined, SearchOutlined, DeleteOutlined, PrinterOutlined, CheckOutlined, CloseOutlined, ClearOutlined } from '@ant-design/icons';
import { useNavigate,  } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { 
  getApiV1SalesDelivery, 
  deleteApiV1SalesDeliveryByMovementNumber,
  postApiV1SalesDeliveryByMovementNumberConfirm,
  postApiV1SalesDeliveryByMovementNumberCancelConfirm,
  getApiV1SalesDeliveryByMovementNumberSalesDeliveryReport
} from '@/api/generated/sdk.gen';
import DynamicSearchTags from '@/components/Form/DynamicSearchTags';
import DynamicSearchForm from '@/components/Form/DynamicSearchForm';
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

  const handleTableChange = (pagination: any) => {
    setParams({ pageNumber: pagination.current, pageSize: pagination.pageSize });
  };

  const { downloadFile, isDownloading } = useFileDownload();

  const handleAction = async (action: string, row: SalesDeliveryDto) => {
    try {
      if (action === 'confirm') await postApiV1SalesDeliveryByMovementNumberConfirm({ path: { movementNumber: row.documentNumber! } });
      if (action === 'cancelConfirm') await postApiV1SalesDeliveryByMovementNumberCancelConfirm({ path: { movementNumber: row.documentNumber! } });
      message.success('操作成功');
      queryClient.invalidateQueries({ queryKey: ['salesdeliveries'] });
    } catch (error) {
      modal.error({ title: '錯誤', content: getApiErrorMessage(error) });
    }
  };



  const columns = useMemo(() => {
    const baseColumns = getColumns((row) => navigate(`/sales/salesdeliveries/${row.documentNumber}`));
    baseColumns.unshift({
      title: '操作',
      key: 'action',
      width: 220,
      fixed: 'right' as const,
      render: (_, record: SalesDeliveryDto) => {
        const canView = hasPermission('Sales.Deliveries.View');
        const canUpdate = hasPermission('Sales.Deliveries.Update');
        const canDelete = hasPermission('Sales.Deliveries.Delete');
        const canConfirm = hasPermission('Sales.Deliveries.Update'); // Assuming same perm

        return (
          <Space size="middle" onClick={(e) => e.stopPropagation()}>
            {(canView || canUpdate) && (
              <Tooltip title="檢視"><Button type="text" icon={<EyeOutlined />} style={{ color: '#1677ff' }} onClick={() => navigate(`/sales/salesdeliveries/${record.documentNumber}`)} /></Tooltip>
            )}
            {!record.confirmDate && canConfirm && (
              <Tooltip title="確認"><Button type="text" icon={<CheckOutlined />} style={{ color: '#52c41a' }} onClick={() => modal.confirm({ title: '確認銷貨單', content: '確定要確認此銷貨單嗎？', onOk: () => handleAction('confirm', record) })} /></Tooltip>
            )}
            {record.confirmDate && canConfirm && (
              <Tooltip title="取消確認"><Button type="text" icon={<CloseOutlined />} danger onClick={() => modal.confirm({ title: '取消確認', content: '確定要取消確認此銷貨單嗎？', onOk: () => handleAction('cancelConfirm', record) })} /></Tooltip>
            )}
            {record.confirmDate && canConfirm && (
              <Tooltip title="列印報表">
                <Button 
                  type="text" 
                  icon={<PrinterOutlined />} 
                  loading={isDownloading}
                  onClick={() => {
                    downloadFile({
                      apiFunction: () => getApiV1SalesDeliveryByMovementNumberSalesDeliveryReport({ 
                        path: { movementNumber: record.documentNumber! },
                        // @ts-ignore
                        responseType: 'blob'
                      }),
                      successMessage: '銷貨單報表已於新分頁開啟',
                      openInNewTab: true
                    });
                  }} 
                />
              </Tooltip>
            )}
            {!record.confirmDate && canDelete && (
              <Tooltip title="刪除"><Button type="text" danger icon={<DeleteOutlined />} onClick={() => modal.confirm({ title: '確認刪除', content: '確定要刪除此銷貨單嗎？此操作無法還原。', okButtonProps: { danger: true }, onOk: () => deleteMutation.mutate(record.documentNumber!) })} /></Tooltip>
            )}
          </Space>
        );
      }
    });
    return baseColumns;
  }, [hasPermission, navigate, modal, deleteMutation]);

  return (
    <div className="p-[16px_16px_0px_16px] flex flex-col" style={{height: 'calc(100vh - 64px)'}}>
      <Card
        style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        styles={{ 
          header: { borderBottom: '1px solid #f0f0f0', padding: '16px 24px' },
          body: { flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '16px 16px 4px 16px' }
        }}
        title={
          <div className="flex items-center gap-3">
            <div style={{ width: '4px', height: '24px', backgroundColor: '#1677ff', borderRadius: '2px' }} />
            <div className="m-0 font-semibold" style={{fontSize: '20px'}}>
              銷貨單管理
            </div>
          </div>
        }
        variant="borderless"
        extra={
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
        }
      >
        <div className="mb-4 flex items-center p-[12px_16px]" style={{flexWrap: 'wrap', backgroundColor: 'var(--ant-color-fill-tertiary, #fafafa)', borderRadius: '6px', flexShrink: 0 }}>
          <span className="mr-3 font-medium" style={{fontSize: '14px', color: 'var(--ant-color-text-description, #8c8c8c)'}}>目前的查詢條件:</span>
          <DynamicSearchTags
            config={searchConfig}
            params={params}
            onClose={(key) => setParams({ [key]: undefined, pageNumber: 1 })}
          />
        </div>
        <div className="flex flex-col" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <style>{`
            .ant-table-wrapper { height: 100%; display: flex; flex-direction: column; }
            .ant-spin-nested-loading { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
            .ant-spin { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
            .ant-spin-container { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
            .ant-table { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
            .ant-table-container { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
            .ant-table-body { flex: 1; overflow-y: auto !important; max-height: none !important; }
            .ant-table-pagination { margin-top: auto !important; margin-bottom: 0 !important; }
            .ant-table-thead > tr > th { text-align: center !important; }
          `}</style>

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
            onRow={(record) => ({
              onClick: () => navigate(`/sales/salesdeliveries/${record.documentNumber}`),
              className: 'cursor-pointer'
            })}
          />
        </div>
      </Card>

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
