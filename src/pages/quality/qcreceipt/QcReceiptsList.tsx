import React, { useState } from 'react';
import { Button, Modal, Table, Tag, message } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';

import PageContainer from '@/components/PageContainer';
import { DynamicSearchForm, DynamicSearchTags } from '@/components/Form';
import { TableActions } from '@/constants/actionStyles';
import { MODAL_BODY_MAX_HEIGHT, MODAL_WIDTH_SEARCH } from '@/constants/ui';
import { getApiV1QcReceipt, postApiV1QcReceiptByMovementNumberConfirm, postApiV1QcReceiptByMovementNumberCancelConfirm, deleteApiV1QcReceiptByMovementNumber } from '@/api/generated';
import { useQcReceiptQueryStore } from './useQcReceiptQueryStore';
import { qcReceiptSearchConfig, getStatusTagProps } from './QcReceiptConfig';
import { useUrlQuerySync } from '@/hooks/useUrlQuerySync';
import { Form } from 'antd';

export default function QcReceiptsList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { params, setParams, resetParams } = useQcReceiptQueryStore();
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchForm] = Form.useForm();

  const { pageNumber, pageSize, ...queryFields } = params;
  useUrlQuerySync({
    query: queryFields,
    page: pageNumber || 1,
    pageSize: pageSize || 20,
    setPagination: (p, s) => setParams({ pageNumber: p, pageSize: s }),
    setQuery: (q) => setParams(q),
  });

  // Fetch Data
  const { data: response, isLoading } = useQuery({
    queryKey: ['qcReceipts', params],
    queryFn: () => getApiV1QcReceipt({
      query: {
        pageNumber: params.pageNumber,
        pageSize: params.pageSize,
        DocumentNumber: params.documentNumber || undefined,
        DateRange: params.dateRange ? [
          dayjs(params.dateRange[0]).format('YYYY-MM-DD'),
          dayjs(params.dateRange[1]).format('YYYY-MM-DD')
        ] : undefined,
      } as any,
    }),
  });

  const list = response?.data?.data?.data || response?.data?.data || [];
  let displayList = list;
  if (params.status) {
    displayList = list.filter((item: any) => item.status === params.status);
  }

  const total = response?.data?.data?.totalRecords || response?.data?.totalRecords || 0;

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: (movementNumber: string) => deleteApiV1QcReceiptByMovementNumber({ path: { movementNumber } }),
    onSuccess: () => {
      message.success('刪除成功');
      queryClient.invalidateQueries({ queryKey: ['qcReceipts'] });
    },
    onError: (err: any) => message.error(err.response?.data?.message || '刪除失敗'),
  });

  const confirmMutation = useMutation({
    mutationFn: (movementNumber: string) => postApiV1QcReceiptByMovementNumberConfirm({ path: { movementNumber } }),
    onSuccess: () => {
      message.success('確認成功');
      queryClient.invalidateQueries({ queryKey: ['qcReceipts'] });
    },
    onError: (err: any) => message.error(err.response?.data?.message || '確認失敗'),
  });

  const cancelConfirmMutation = useMutation({
    mutationFn: (movementNumber: string) => postApiV1QcReceiptByMovementNumberCancelConfirm({ path: { movementNumber } }),
    onSuccess: () => {
      message.success('取消確認成功');
      queryClient.invalidateQueries({ queryKey: ['qcReceipts'] });
    },
    onError: (err: any) => message.error(err.response?.data?.message || '取消確認失敗'),
  });

  const handleSearch = (values: any) => {
    setParams({
      ...values,
      pageNumber: 1,
    });
    setIsSearchModalOpen(false);
  };

  const handleClearTag = (key: string) => {
    setParams({ [key]: undefined, pageNumber: 1 });
  };

  const columns = [
    {
      title: '操作',
      key: 'actions',
      width: 120,
      fixed: 'left' as const,
      align: 'center' as const,
      render: (_: any, record: any) => {
        const isConfirmed = record.status === 'Confirmed' || record.status === 'Closed';
        return (
          <div className="flex gap-2 justify-center">
            <TableActions.View onClick={() => navigate(`/production-quality/qc-receipts/${record.documentNumber}`)} />
            {!isConfirmed && (
              <>
                <TableActions.Edit onClick={() => navigate(`/production-quality/qc-receipts/${record.documentNumber}`)} />
                <TableActions.Delete onConfirm={() => deleteMutation.mutate(record.documentNumber)} />
                <Button size="small" type="primary" className="text-[12px] h-6" onClick={() => confirmMutation.mutate(record.documentNumber)}>確認</Button>
              </>
            )}
            {record.status === 'Confirmed' && (
              <Button size="small" danger className="text-[12px] h-6" onClick={() => cancelConfirmMutation.mutate(record.documentNumber)}>取消</Button>
            )}
          </div>
        );
      },
    },
    { title: '單據號碼', dataIndex: 'documentNumber', width: 140 },
    { 
      title: '檢驗日期', 
      dataIndex: 'documentDate', 
      width: 120,
      render: (val: string) => val ? dayjs(val).format('YYYY-MM-DD') : '-' 
    },
    { 
      title: '檢驗狀態', 
      dataIndex: 'status', 
      width: 100,
      align: 'center' as const,
      render: (status: string) => {
        const { color, text } = getStatusTagProps(status);
        return <Tag color={color} className="m-0 bg-transparent">{text}</Tag>;
      }
    },
    { title: '負責人', dataIndex: 'responsibleUserName', width: 100, render: (v: string) => v || '-' },
    { 
      title: '確認日期', 
      dataIndex: 'confirmDate', 
      width: 120,
      render: (val: string) => val ? dayjs(val).format('YYYY-MM-DD') : '-' 
    },
    { title: '確認人', dataIndex: 'confirmUserName', width: 100, render: (v: string) => v || '-' },
    { title: '備註', dataIndex: 'notes', ellipsis: true },
  ];

  return (
    <PageContainer
      title="QC 檢驗管理"
      actions={
        <div className="flex gap-2">
          <Button icon={<SearchOutlined />} onClick={() => setIsSearchModalOpen(true)}>
            查詢
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/production-quality/qc-receipts/create')}>
            新增檢驗單
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4 h-full">
        <DynamicSearchTags
          config={qcReceiptSearchConfig()}
          params={params}
          onClose={handleClearTag}
        />

        <Table
          columns={columns}
          dataSource={displayList}
          rowKey="documentNumber"
          loading={isLoading}
          scroll={{ x: 1000, y: 'calc(100vh - 300px)' }}
          pagination={{
            current: params.pageNumber,
            pageSize: params.pageSize,
            total: total,
            showSizeChanger: true,
            showTotal: (t) => `共 ${t} 筆`,
            onChange: (page, pageSize) => setParams({ pageNumber: page, pageSize }),
          }}
        />
      </div>

      <Modal
        title="查詢條件"
        open={isSearchModalOpen}
        onCancel={() => setIsSearchModalOpen(false)}
        width={MODAL_WIDTH_SEARCH}
        styles={{ body: { maxHeight: MODAL_BODY_MAX_HEIGHT, overflowY: 'auto' } }}
        footer={
          <div className="flex justify-end gap-2">
            <Button onClick={() => searchForm.resetFields()}>重設</Button>
            <Button type="primary" onClick={() => searchForm.submit()}>查詢</Button>
          </div>
        }
      >
        <DynamicSearchForm
          config={qcReceiptSearchConfig()}
          form={searchForm}
          onSearch={handleSearch}
        />
      </Modal>
    </PageContainer>
  );
}
