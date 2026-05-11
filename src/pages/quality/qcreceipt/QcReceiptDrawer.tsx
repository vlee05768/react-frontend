import { useState, useMemo, useEffect } from 'react';
import { Drawer, Space, Button, App, Spin } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';

import { ActionButton } from '@/components/common/ActionButton';
import { DrawerTitle } from '@/components/Form/DrawerTitle';
import { DynamicForm } from '@/components/Form/DynamicForm';
import { MasterDetailTabs } from '@/components/Form/MasterDetailTabs';
import { useAuthStore } from '@/stores/useAuthStore';
import { DRAWER_WIDTH_MAIN } from '@/constants/ui';
import { getApiErrorMessage } from '@/utils/apiError';

import {
  getApiV1QcReceiptByMovementNumber,
  postApiV1QcReceipt,
  putApiV1QcReceiptByMovementNumber,
  postApiV1QcReceiptByMovementNumberConfirm,
} from '@/api/generated';

import { getStatusTagProps } from './QcReceiptConfig';
import QcReceiptItemsTab from './QcReceiptItemsTab';

export default function QcReceiptDrawer() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const { user, hasPermission } = useAuthStore();

  const isCreating = id === 'create';
  const [isEditing, setIsEditing] = useState(isCreating);
  const [activeTab, setActiveTab] = useState('master_info');

  const { data, isLoading } = useQuery({
    queryKey: ['qcReceipt', id],
    queryFn: () => getApiV1QcReceiptByMovementNumber({ path: { movementNumber: id! } }),
    enabled: !isCreating && !!id,
    retry: false,
  });

  const receiptData = (data?.data?.data as any) || undefined;
  
  // Disable fields if it's read mode or it's confirmed
  const isViewMode = !isEditing;
  const isUpdateMode = isEditing && !isCreating;
  const isConfirmed = receiptData?.status === 'Confirmed' || receiptData?.status === 'Closed';
  const isFormLocked = isViewMode || isConfirmed;

  const defaultValues = useMemo(() => {
    if (isCreating) {
      return {
        documentDate: dayjs(),
        responsibleEmployeeCode: user?.employeeCode,
        responsibleUserName: user?.name,
        status: 'Unconfirmed',
      };
    }
    if (receiptData) {
      return {
        ...receiptData,
        documentDate: receiptData.documentDate ? dayjs(receiptData.documentDate) : null,
      };
    }
    return {};
  }, [isCreating, receiptData, user]);

  const createMutation = useMutation({
    mutationFn: (body: any) => postApiV1QcReceipt({ body }),
    onSuccess: (res) => {
      message.success('新增成功');
      queryClient.invalidateQueries({ queryKey: ['qcReceipts'] });
      const newId = (res.data?.data as any)?.documentNumber || res.data?.documentNumber;
      navigate(`/production-quality/qc-receipts/${newId}`, { replace: true });
    },
    onError: (err) => message.error(getApiErrorMessage(err, '新增失敗')),
  });

  const updateMutation = useMutation({
    mutationFn: (body: any) => putApiV1QcReceiptByMovementNumber({ path: { movementNumber: id! }, body }),
    onSuccess: () => {
      message.success('更新成功');
      queryClient.invalidateQueries({ queryKey: ['qcReceipt'] });
      queryClient.invalidateQueries({ queryKey: ['qcReceipts'] });
      setIsEditing(false);
    },
    onError: (err) => message.error(getApiErrorMessage(err, '更新失敗')),
  });

  const confirmMutation = useMutation({
    mutationFn: () => postApiV1QcReceiptByMovementNumberConfirm({ path: { movementNumber: id! } }),
    onSuccess: () => {
      message.success('確認成功');
      queryClient.invalidateQueries({ queryKey: ['qcReceipt'] });
      queryClient.invalidateQueries({ queryKey: ['qcReceipts'] });
      setIsEditing(false);
    },
    onError: (err) => message.error(getApiErrorMessage(err, '確認失敗')),
  });

  const handleFinish = (values: any) => {
    const payload = {
      documentDate: values.documentDate ? values.documentDate.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
      notes: values.notes || null,
      responsibleEmployeeCode: values.responsibleEmployeeCode || null,
    };

    if (isCreating) {
      createMutation.mutate(payload);
    } else {
      updateMutation.mutate(payload);
    }
  };

  const handleClose = () => {
    navigate('/production-quality/qc-receipts');
  };

  const config = [
    { name: 'documentNumber', label: '單據號碼', componentType: 'Input' as const, colSpan: 12, componentProps: { disabled: true, placeholder: '系統自動產生' } },
    { name: 'documentDate', label: '單據日期', componentType: 'DatePicker' as const, colSpan: 12, rules: [{ required: true, message: '必填' }] },
    { name: 'status', label: '單據狀態', componentType: 'Input' as const, colSpan: 12, componentProps: { disabled: true, value: getStatusTagProps(defaultValues.status || 'Unconfirmed').text } },
    { name: 'responsibleUserName', label: '負責人員', componentType: 'Input' as const, colSpan: 12, componentProps: { disabled: true } },
    { name: 'notes', label: '備註', componentType: 'TextArea' as const, colSpan: 24, componentProps: { rows: 2 } },
    // Hidden field to keep responsibleEmployeeCode
    { name: 'responsibleEmployeeCode', label: '', componentType: 'Input' as const, colSpan: 0, componentProps: { style: { display: 'none' } } },
  ];

  return (
    <Drawer
      title={<DrawerTitle 
        title="QC 檢驗單" 
        documentNumber={isCreating ? '新增' : id} 
        isCreating={isCreating} 
        isEditing={isEditing} 
      />}
      placement="right"
      width={DRAWER_WIDTH_MAIN}
      onClose={handleClose}
      open={true}
      maskClosable={false}
      destroyOnClose
      extra={
        <Space>
          {isViewMode && !isConfirmed && (
            <ActionButton.Edit onClick={() => setIsEditing(true)} permission="ProductionQuality.QcReceipts.Update" />
          )}
          {isViewMode && !isConfirmed && (
            <Button type="primary" onClick={() => confirmMutation.mutate()} loading={confirmMutation.isPending}>確認單據</Button>
          )}
          {isEditing && (
            <>
              <ActionButton.Cancel onClick={() => isCreating ? handleClose() : setIsEditing(false)} />
              <ActionButton.Save 
                form="qc-receipt-form" 
                loading={createMutation.isPending || updateMutation.isPending} 
              />
            </>
          )}
        </Space>
      }
    >
      <Spin spinning={isLoading}>
        <MasterDetailTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isCreateMode={isCreating}
          isEditMode={isEditing}
          viewId={id}
          masterContent={
            <DynamicForm
              id="qc-receipt-form"
              config={config}
              defaultValues={defaultValues}
              onFinish={handleFinish}
              isViewMode={isFormLocked}
              isUpdateMode={isUpdateMode}
            />
          }
          detailTabs={[
            {
              key: 'items',
              label: '檢驗明細',
              content: <QcReceiptItemsTab 
                documentNumber={id!} 
                isLocked={isFormLocked || isCreating} 
                receiptData={receiptData}
              />
            }
          ]}
        />
      </Spin>
    </Drawer>
  );
}
