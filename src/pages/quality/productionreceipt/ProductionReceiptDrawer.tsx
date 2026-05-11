import React, { useEffect, useState } from 'react';
import { Form, Spin, Drawer, Button, message, Space } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';

import { MasterDetailTabs } from '@/components/Form/MasterDetailTabs';
import { DrawerTitle } from '@/components/Form/DrawerTitle';
import { DynamicForm } from '@/components/Form/DynamicForm';
import { DRAWER_WIDTH_MAIN } from '@/constants/ui';

import { 
  getApiV1ProductionReceiptByMovementNumber, 
  postApiV1ProductionReceiptByMovementNumberConfirm, 
  postApiV1ProductionReceiptByMovementNumberCancelConfirm,
  postApiV1ProductionReceiptByMovementNumberClose,
  postApiV1ProductionReceiptByMovementNumberCancelClose
} from '@/api/generated';

import ProductionReceiptItemsTab from './ProductionReceiptItemsTab';
import { getStatusTagProps } from './ProductionReceiptConfig';

export default function ProductionReceiptDrawer() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('master_info');

  const isVisible = !!id;

  const { data: response, isLoading } = useQuery({
    queryKey: ['productionReceipt', id],
    queryFn: () => getApiV1ProductionReceiptByMovementNumber({ path: { movementNumber: id! } }),
    enabled: isVisible,
  });

  const formData = response?.data?.data || response?.data;

  const confirmMutation = useMutation({
    mutationFn: (movementNumber: string) => postApiV1ProductionReceiptByMovementNumberConfirm({ path: { movementNumber } }),
    onSuccess: () => {
      message.success('確認成功');
      queryClient.invalidateQueries({ queryKey: ['productionReceipts'] });
      queryClient.invalidateQueries({ queryKey: ['productionReceipt', id] });
    },
    onError: (err: any) => message.error(err.response?.data?.message || '確認失敗'),
  });

  const cancelConfirmMutation = useMutation({
    mutationFn: (movementNumber: string) => postApiV1ProductionReceiptByMovementNumberCancelConfirm({ path: { movementNumber } }),
    onSuccess: () => {
      message.success('取消確認成功');
      queryClient.invalidateQueries({ queryKey: ['productionReceipts'] });
      queryClient.invalidateQueries({ queryKey: ['productionReceipt', id] });
    },
    onError: (err: any) => message.error(err.response?.data?.message || '取消確認失敗'),
  });

  const closeMutation = useMutation({
    mutationFn: (movementNumber: string) => postApiV1ProductionReceiptByMovementNumberClose({ path: { movementNumber } }),
    onSuccess: () => {
      message.success('結案成功');
      queryClient.invalidateQueries({ queryKey: ['productionReceipts'] });
      queryClient.invalidateQueries({ queryKey: ['productionReceipt', id] });
    },
    onError: (err: any) => message.error(err.response?.data?.message || '結案失敗'),
  });

  const cancelCloseMutation = useMutation({
    mutationFn: (movementNumber: string) => postApiV1ProductionReceiptByMovementNumberCancelClose({ path: { movementNumber } }),
    onSuccess: () => {
      message.success('取消結案成功');
      queryClient.invalidateQueries({ queryKey: ['productionReceipts'] });
      queryClient.invalidateQueries({ queryKey: ['productionReceipt', id] });
    },
    onError: (err: any) => message.error(err.response?.data?.message || '取消結案失敗'),
  });

  const handleClose = () => {
    navigate('/production-quality/production-receipts');
  };

  const status = formData?.status || 'Unconfirmed';

  const defaultValues = formData ? {
    ...formData,
    documentDate: formData.documentDate ? dayjs(formData.documentDate) : null,
  } : {};

  const config = [
    { name: 'documentNumber', label: '單據號碼', componentType: 'Input' as const, colSpan: 12, componentProps: { disabled: true } },
    { name: 'documentDate', label: '單據日期', componentType: 'DatePicker' as const, colSpan: 12, componentProps: { disabled: true } },
    { name: 'status', label: '單據狀態', componentType: 'Input' as const, colSpan: 12, componentProps: { disabled: true, value: getStatusTagProps(status).text } },
    { name: 'responsibleUserName', label: '負責人員', componentType: 'Input' as const, colSpan: 12, componentProps: { disabled: true } },
    { name: 'notes', label: '備註', componentType: 'TextArea' as const, colSpan: 24, componentProps: { rows: 2, disabled: true } },
  ];

  return (
    <Drawer
      title={<DrawerTitle 
        title="製令入庫單" 
        documentNumber={id} 
        isCreating={false} 
        isEditing={false} 
      />}
      placement="right"
      width={DRAWER_WIDTH_MAIN}
      open={isVisible}
      onClose={handleClose}
      maskClosable={false}
      destroyOnClose
      extra={
        <Space>
          {status === 'Unconfirmed' && (
            <Button type="primary" onClick={() => confirmMutation.mutate(id!)} loading={confirmMutation.isPending}>確認單據</Button>
          )}
          {status === 'Confirmed' && (
            <Button onClick={() => cancelConfirmMutation.mutate(id!)} loading={cancelConfirmMutation.isPending} danger>取消確認</Button>
          )}
          {status === 'Confirmed' && (
            <Button style={{ backgroundColor: '#2080f0', color: 'white' }} onClick={() => closeMutation.mutate(id!)} loading={closeMutation.isPending}>結案單據</Button>
          )}
          {status === 'Closed' && (
            <Button onClick={() => cancelCloseMutation.mutate(id!)} loading={cancelCloseMutation.isPending}>取消結案</Button>
          )}
        </Space>
      }
    >
      <Spin spinning={isLoading}>
        <MasterDetailTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isCreateMode={false}
          isEditMode={false}
          viewId={id}
          masterContent={
            <DynamicForm
              formId="production-receipt-form"
              fields={config}
              defaultValues={defaultValues}
              onSubmit={() => {}}
              isViewMode={true}
              isUpdateMode={false}
            />
          }
          detailTabs={[
            {
              key: 'items',
              label: '入庫明細',
              children: <ProductionReceiptItemsTab items={formData?.items || []} />
            }
          ]}
        />
      </Spin>
    </Drawer>
  );
}
