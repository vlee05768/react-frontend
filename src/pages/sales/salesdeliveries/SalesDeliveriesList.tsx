import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Card, Table, Button, Space, Tooltip, App, Modal } from 'antd';
import { EyeOutlined, PlusOutlined, SearchOutlined, DeleteOutlined, PrinterOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { useNavigate,  } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { 
  getApiV1SalesDelivery, 
  deleteApiV1SalesDeliveryByMovementNumber,
  postApiV1SalesDeliveryByMovementNumberConfirm,
  postApiV1SalesDeliveryByMovementNumberCancelConfirm,
  postApiV1SalesDeliveryByMovementNumberClose,
  postApiV1SalesDeliveryByMovementNumberCancelClose,
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

  const searchForm = useForm();
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

  const handleAction = async (action: string, row: SalesDeliveryDto) => {
    try {
      if (action === 'confirm') await postApiV1SalesDeliveryByMovementNumberConfirm({ path: { movementNumber: row.documentNumber! } });
      if (action === 'cancelConfirm') await postApiV1SalesDeliveryByMovementNumberCancelConfirm({ path: { movementNumber: row.documentNumber! } });
      if (action === 'close') await postApiV1SalesDeliveryByMovementNumberClose({ path: { movementNumber: row.documentNumber! } });
      if (action === 'cancelClose') await postApiV1SalesDeliveryByMovementNumberCancelClose({ path: { movementNumber: row.documentNumber! } });
      message.success('操作成功');
      queryClient.invalidateQueries({ queryKey: ['salesdeliveries'] });
    } catch (error) {
      modal.error({ title: '錯誤', content: getApiErrorMessage(error) });
    }
  };

  const downloadReport = async (row: SalesDeliveryDto) => {
    const hide = message.loading('報表產生中...', 0);
    try {
      const res = await getApiV1SalesDeliveryByMovementNumberSalesDeliveryReport({ path: { movementNumber: row.documentNumber! }, responseType: 'blob' as any });
      const blobUrl = URL.createObjectURL(res.data as any);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `銷貨單報表_${row.documentNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      hide();
    } catch (error) {
      hide();
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
            {record.confirmDate && !record.closeDate && canConfirm && (
              <Tooltip title="取消確認"><Button type="text" icon={<CloseOutlined />} danger onClick={() => modal.confirm({ title: '取消確認', content: '確定要取消確認此銷貨單嗎？', onOk: () => handleAction('cancelConfirm', record) })} /></Tooltip>
            )}
            {record.confirmDate && !record.closeDate && canConfirm && (
              <Tooltip title="列印報表"><Button type="text" icon={<PrinterOutlined />} onClick={() => downloadReport(record)} /></Tooltip>
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
    <div className="p-[16px 16px 0px 16px] flex flex-col" style={{height: 'calc(100vh - 64px)'}}>
      <Card 
        title="銷貨單列表"
        extra={
          <Space>
            <DynamicSearchTags 
              params={queryFields} 
              config={searchConfig} 
              onClose={(key) => setParams({ [key]: undefined, pageNumber: 1 })}
            />
            <Button onClick={() => { searchForm.reset(queryFields); setIsSearchModalOpen(true); }} icon={<SearchOutlined />}>查詢</Button>
            {hasPermission('Sales.Deliveries.Create') && <Button type="primary" onClick={() => navigate('/sales/salesdeliveries/create')} icon={<PlusOutlined />}>新增</Button>}
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={listData}
          rowKey="documentNumber"
          loading={isLoading}
          pagination={{ current: pageNumber, pageSize, total, showSizeChanger: true }}
          onChange={handleTableChange}
          scroll={{ x: 'max-content' }}
          onRow={(record) => ({
            onClick: () => navigate(`/sales/salesdeliveries/${record.documentNumber}`),
            className: 'cursor-pointer hover:bg-gray-50'
          })}
        />
      </Card>

      <Modal
        title="進階查詢"
        open={isSearchModalOpen}
        onCancel={() => setIsSearchModalOpen(false)}
        footer={null}
        width={MODAL_WIDTH_SEARCH}
        styles={{ body: { maxHeight: MODAL_BODY_MAX_HEIGHT, overflowY: 'auto' } }}
      >
        <DynamicSearchForm
          config={searchConfig}
          form={searchForm}
          onSearch={(values) => {
            setParams({ ...values, pageNumber: 1 });
            setIsSearchModalOpen(false);
          }}
          
        />
      </Modal>
    </div>
  );
}
