import { useState, useMemo } from 'react';
import { Drawer, Space, Button, App, Spin } from 'antd';
import { EditOutlined, CloseOutlined, SaveOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';

import { ActionButton } from '@/components/common/ActionButton';

import { DynamicForm } from '@/components/Form/DynamicForm';
import { MasterDetailTabs } from '@/components/Form/MasterDetailTabs';
import { DrawerTitle } from '@/components/Form/DrawerTitle';
import { useAuthStore } from '@/stores/useAuthStore';
import { DRAWER_WIDTH_MAIN } from '@/constants/ui';
import { getApiErrorMessage } from '@/utils/apiError';

import {
  getApiV1QcReceiptByMovementNumber,
  postApiV1QcReceipt,
  putApiV1QcReceiptByMovementNumber,
  postApiV1QcReceiptByMovementNumberConfirm,
  postApiV1QcReceiptByMovementNumberCancelConfirm
} from '@/api/generated';

import { mainFormConfig } from './QcReceiptConfig';
import QcReceiptItemsTab from './QcReceiptItemsTab';

export default function QcReceiptDrawer() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

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
      const newId = (res.data?.data as any)?.documentNumber || (res.data as any)?.documentNumber;
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

  const cancelConfirmMutation = useMutation({
    mutationFn: () => postApiV1QcReceiptByMovementNumberCancelConfirm({ path: { movementNumber: id! } }),
    onSuccess: () => {
      message.success('取消確認成功');
      queryClient.invalidateQueries({ queryKey: ['qcReceipt'] });
      queryClient.invalidateQueries({ queryKey: ['qcReceipts'] });
    },
    onError: (err) => message.error(getApiErrorMessage(err, '取消確認失敗')),
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



  return (
    <Drawer
      title={
        <DrawerTitle
          moduleName="QC檢驗單"
          isCreate={isCreating}
          isEdit={isEditing}
          record={{ documentNumber: id }}
          displayField="documentNumber"
        />
      }
      placement="right"
      width={DRAWER_WIDTH_MAIN}
      onClose={handleClose}
      open={true}
      maskClosable={false}
      destroyOnClose
      extra={
        <Space>
          {isViewMode && !isConfirmed && (
            <ActionButton icon={<EditOutlined />} onClick={() => setIsEditing(true)} />
          )}
          {isViewMode && !isConfirmed && (
            <Button type="primary" icon={<CheckCircleOutlined />} onClick={() => confirmMutation.mutate()} loading={confirmMutation.isPending}>確認單據</Button>
          )}
          {isViewMode && isConfirmed && (
            <Button danger icon={<CloseOutlined />} onClick={() => cancelConfirmMutation.mutate()} loading={cancelConfirmMutation.isPending}>取消確認</Button>
          )}
          {isEditing && (
            <>
              <ActionButton icon={<CloseOutlined />} onClick={() => isCreating ? handleClose() : setIsEditing(false)} />
              <ActionButton intent="primary" icon={<SaveOutlined />} 
                onClick={() => {
                  const formElement = document.getElementById('qc-receipt-form') as HTMLFormElement;
                  if (formElement) {
                    formElement.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                  }
                }}
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
              formId="qc-receipt-form"
              fields={mainFormConfig() as any}
              defaultValues={defaultValues}
              onSubmit={handleFinish}
              isViewMode={isFormLocked}
              isUpdateMode={isUpdateMode}
            />
          }
          detailTabs={[
            {
              key: 'items',
              label: '檢驗明細',
              children: <QcReceiptItemsTab 
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
