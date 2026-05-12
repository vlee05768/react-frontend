import { useState, useMemo } from 'react';
import { Drawer, Space, Button, App, Spin } from 'antd';
import { EditOutlined, SaveOutlined, CheckCircleOutlined, SyncOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';

import { ActionButton } from '@/components/common/ActionButton';

import { DynamicForm } from '@/components/Form/DynamicForm';
import { ActionBar } from '@/components/common/ActionBar';
import { DocumentLifecycleBanner } from '@/components/common/DocumentLifecycleBanner';
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
  const { message, modal } = App.useApp();
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
      documentDate: values.documentDate ? dayjs(values.documentDate).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
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




  const getHeaderActions = () => {
    if (isCreating || isEditing) return null;
    if (!receiptData) return null;

    return (
      <Space>
        {isViewMode && !isConfirmed && (
          <ActionButton 
            key="confirm"
            intent="success" icon={<CheckCircleOutlined />} 
            loading={confirmMutation.isPending}
            onClick={(e) => {
              e.preventDefault();
              modal.confirm({
                title: '確認單據',
                content: '確定要確認此單據？',
                centered: true,
                width: 400,
                onOk: () => confirmMutation.mutateAsync()
              });
            }}
          >
            確認單據
          </ActionButton>
        )}
        {isViewMode && isConfirmed && (
          <ActionButton 
            key="cancel-confirm"
            intent="warning" icon={<SyncOutlined />} 
            loading={cancelConfirmMutation.isPending}
            onClick={(e) => {
              e.preventDefault();
              modal.confirm({
                title: '取消確認',
                content: '確定要取消確認此單據？',
                centered: true,
                width: 400,
                okButtonProps: { danger: true },
                onOk: () => cancelConfirmMutation.mutateAsync()
              });
            }}
          >
            取消確認
          </ActionButton>
        )}
      </Space>
    );
  };

  const getActionBarActions = () => {
    if (isCreating || isEditing) {
      return (
        <Space>
          <Button key="save" type="primary" onClick={() => (document.getElementById("qc-receipt-form") as HTMLFormElement)?.requestSubmit()} icon={<SaveOutlined />} loading={createMutation.isPending || updateMutation.isPending}>
            儲存主檔
          </Button>
          <Button key="cancel" onClick={(e) => {
            e.preventDefault();
            isCreating ? handleClose() : setIsEditing(false)
          }}>
            取消
          </Button>
        </Space>
      );
    }

    if (!receiptData) return null;

    return (
      <Space>
        {isViewMode && !isConfirmed && (
          <Button key="edit" type="primary" icon={<EditOutlined />} onClick={(e) => { e.preventDefault(); setIsEditing(true); }}>
            編輯主檔
          </Button>
        )}
      </Space>
    );
  };

  let steps: any[] = [];
  if (receiptData) {
    steps = [
      {
        title: '準備中',
        status: receiptData.status !== 'Unconfirmed' ? 'finish' : 'process',
        date: receiptData.createdAt,
        user: receiptData.createdBy,
      },
      {
        title: '檢驗確認',
        status: receiptData.status === 'Unconfirmed' ? 'wait' : 'finish',
        date: receiptData.confirmDate,
        user: receiptData.confirmUserName,
      }
    ];
  }

  const drawerStyles = {
    body: { padding: 0, overflow: 'hidden' as const }
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
      size={DRAWER_WIDTH_MAIN as any}
      onClose={handleClose}
      open={true}
      mask={{ closable: isViewMode }}
      keyboard={isViewMode}
      destroyOnClose
      styles={drawerStyles}
      extra={getHeaderActions()}
    >
      <Spin spinning={isLoading}>
        <ActionBar 
            createdBy={receiptData?.createdBy || undefined}
            createdAt={receiptData?.createdAt || undefined}
            updatedBy={receiptData?.updatedBy || undefined}
            updatedAt={receiptData?.updatedAt || undefined}
            actions={getActionBarActions()}
          />
        <div style={{ padding: "8px 24px" }}>
          {!isCreating && receiptData && <DocumentLifecycleBanner steps={steps} />}
          <MasterDetailTabs
            heightOffset={!isCreating && receiptData ? 320 : 160}
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
              hideDefaultFooter
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
        </div>
      </Spin>
    </Drawer>
  );
}
