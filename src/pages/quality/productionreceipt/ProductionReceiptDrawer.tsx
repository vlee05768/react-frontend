import { useState } from 'react';
import { Spin, Drawer, Space, App } from 'antd';
import { CheckCircleOutlined, SyncOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';

import { ActionButton } from '@/components/common/ActionButton';
import { ActionBar } from '@/components/common/ActionBar';
import { DocumentLifecycleBanner } from '@/components/common/DocumentLifecycleBanner';
import { MasterDetailTabs } from '@/components/Form/MasterDetailTabs';
import { DrawerTitle } from '@/components/Form/DrawerTitle';

import { DynamicForm } from '@/components/Form/DynamicForm';
import { DRAWER_WIDTH_MAIN } from '@/constants/ui';

import { 
  getApiV1ProductionReceiptByMovementNumber, 
  postApiV1ProductionReceiptByMovementNumberConfirm, 
  postApiV1ProductionReceiptByMovementNumberCancelConfirm,
} from '@/api/generated';

import ProductionReceiptItemsTab from './ProductionReceiptItemsTab';
import { mainFormConfig } from './ProductionReceiptConfig';

export default function ProductionReceiptDrawer() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('master_info');

  const isVisible = !!id;

  const { data: response, isLoading } = useQuery({
    queryKey: ['productionReceipt', id],
    queryFn: () => getApiV1ProductionReceiptByMovementNumber({ path: { movementNumber: id! } }),
    enabled: isVisible,
  });

  const formData: any = response?.data?.data || response?.data;

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

  /* const closeMutation = useMutation({
    onSuccess: () => {
      message.success('結案成功');
      queryClient.invalidateQueries({ queryKey: ['productionReceipts'] });
      queryClient.invalidateQueries({ queryKey: ['productionReceipt', id] });
    },
    onError: (err: any) => message.error(err.response?.data?.message || '結案失敗'),
  }); */

  /* const cancelCloseMutation = useMutation({
    onSuccess: () => {
      message.success('取消結案成功');
      queryClient.invalidateQueries({ queryKey: ['productionReceipts'] });
      queryClient.invalidateQueries({ queryKey: ['productionReceipt', id] });
    },
    onError: (err: any) => message.error(err.response?.data?.message || '取消結案失敗'),
  }); */

  const handleClose = () => {
    navigate('/production-quality/production-receipts');
  };

  const status = (formData as any)?.status || 'Unconfirmed';

  const defaultValues = formData ? {
    ...formData,
      documentDate: (formData as any)?.documentDate ? dayjs((formData as any).documentDate) : null,
  } : {};




  const getHeaderActions = () => {
    if (!formData) return null;

    return (
      <Space>
        {status === 'Unconfirmed' && (
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
                onOk: () => confirmMutation.mutateAsync(id!)
              });
            }}
          >
            確認單據
          </ActionButton>
        )}
        {status === 'Confirmed' && (
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
                onOk: () => cancelConfirmMutation.mutateAsync(id!)
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
    return null;
  };

  let steps: any[] = [];
  if (formData) {
    steps = [
      {
        title: '準備中',
        status: formData.status !== 'Unconfirmed' ? 'finish' : 'process',
        date: formData.createdAt,
        user: formData.createdBy,
      },
      {
        title: '入庫確認',
        status: formData.status === 'Unconfirmed' ? 'wait' : 'finish',
        date: formData.confirmDate,
        user: formData.confirmUserName,
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
          moduleName="製令入庫單"
          isCreate={false}
          isEdit={false}
          record={{ documentNumber: id }}
          displayField="documentNumber"
        />
      }
      placement="right"
      width={DRAWER_WIDTH_MAIN}
      open={isVisible}
      onClose={handleClose}
      mask={{ closable: true }}
      keyboard={true}
      destroyOnClose
      styles={drawerStyles}
      extra={getHeaderActions()}
    >
      <Spin spinning={isLoading}>
        {formData && (
          <ActionBar 
            createdBy={formData.createdBy || undefined}
            createdAt={formData.createdAt || undefined}
            updatedBy={formData.updatedBy || undefined}
            updatedAt={formData.updatedAt || undefined}
            actions={getActionBarActions()}
          />
        )}
        <div style={{ padding: "8px 24px" }}>
          {formData && <DocumentLifecycleBanner steps={steps} />}
          <MasterDetailTabs
            heightOffset={formData ? 320 : 160}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isCreateMode={false}
          isEditMode={false}
          viewId={id}
          masterContent={
            <DynamicForm
              formId="production-receipt-form"
              fields={mainFormConfig() as any}
              defaultValues={defaultValues}
              onSubmit={() => {}}
              hideDefaultFooter
              isViewMode={true}
              isUpdateMode={false}
            />
          }
          detailTabs={[
            {
              key: 'items',
              label: '入庫明細',
              children: <ProductionReceiptItemsTab items={(formData as any)?.items || []} />
            }
          ]}
        />
        </div>
      </Spin>
    </Drawer>
  );
}
