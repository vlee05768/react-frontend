import { useState, useRef, useEffect } from 'react';
import { Spin, Drawer, Space, App, Button } from 'antd';
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
  postApiV1ProductionReceipt,
  putApiV1ProductionReceiptByMovementNumber, 
  postApiV1ProductionReceiptByMovementNumberConfirm, 
  postApiV1ProductionReceiptByMovementNumberCancelConfirm,
} from '@/api/generated';

import ProductionReceiptItemsTab from './ProductionReceiptItemsTab';
import { getStatusTag, mainFormConfig } from './ProductionReceiptConfig';
import { DocumentWatchButton } from '@/components/common/DocumentWatchButton';

export default function ProductionReceiptDrawer() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('master_info');

  const isCreating = id === 'create';
  const [isEditing, setIsEditing] = useState(isCreating);
  const isVisible = !!id;

  const hasAutoSwitchedRef = useRef(false);

  useEffect(() => {
    hasAutoSwitchedRef.current = false;
  }, [id]);

  const { data: response, isLoading } = useQuery({
    queryKey: ['productionReceipt', id],
    queryFn: () => getApiV1ProductionReceiptByMovementNumber({ path: { movementNumber: id! } }),
    enabled: isVisible,
  });

  const formData: any = response?.data?.data || response?.data;

  useEffect(() => {
    const isViewMode = !isEditing && !isCreating;
    if (isViewMode && formData && !isLoading) {
      if (!hasAutoSwitchedRef.current) {
        if (Array.isArray(formData.items) && formData.items.length === 0) {
          setActiveTab('items');
        }
        hasAutoSwitchedRef.current = true;
      }
    }
  }, [isEditing, isCreating, formData, isLoading]);

  
  const createMutation = useMutation({
    mutationFn: (body: any) => postApiV1ProductionReceipt({ body }),
    onSuccess: (res) => {
      message.success('新增成功');
      queryClient.invalidateQueries({ queryKey: ['productionReceipts'] });
      const newId = (res.data?.data as any)?.documentNumber || (res.data as any)?.documentNumber;
      navigate(`/production-quality/production-receipts/${newId}`, { replace: true });
    },
    onError: (err: any) => message.error(err.response?.data?.message || '新增失敗'),
  });

  const updateMutation = useMutation({
    mutationFn: (body: any) => putApiV1ProductionReceiptByMovementNumber({ path: { movementNumber: id! }, body }),
    onSuccess: () => {
      message.success('更新成功');
      queryClient.invalidateQueries({ queryKey: ['productionReceipt'] });
      queryClient.invalidateQueries({ queryKey: ['productionReceipts'] });
      setIsEditing(false);
    },
    onError: (err: any) => message.error(err.response?.data?.message || '更新失敗'),
  });

  const handleFinish = (values: any) => {
    const payload = {
      documentDate: values.documentDate ? dayjs(values.documentDate).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
      workOrderNumber: values.workOrderNumber,
      notes: values.notes || null,
      responsibleEmployeeCode: values.responsibleEmployeeCode || null,
    };

    if (isCreating) {
      createMutation.mutate(payload);
    } else {
      updateMutation.mutate(payload);
    }
  };

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

  const defaultValues = formData ? {
    ...formData,
      documentDate: (formData as any)?.documentDate ? dayjs((formData as any).documentDate) : null,
  } : {};




  const getDocumentStatus = (data: any) => {
    if (!data) return 'UNCONFIRMED';
    if (data.closeDate) return 'CLOSED';
    if (data.confirmDate) return 'CONFIRMED';
    if (data.status) return String(data.status).toUpperCase();
    return 'UNCONFIRMED';
  };

  const getHeaderActions = () => {
    if (isEditing || isCreating) return null;
    if (!formData) return null;

    const currentStatus = getDocumentStatus(formData);

    return (
      <Space>
        <DocumentWatchButton documentType="ProductionReceipt" documentKey={formData?.documentNumber} />
        {currentStatus === 'UNCONFIRMED' && (
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
        {currentStatus === 'CONFIRMED' && (
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
    if (isCreating || isEditing) {
      return (
        <Space>
          <Button key="save" type="primary" onClick={() => (document.getElementById("production-receipt-form") as HTMLFormElement)?.requestSubmit()} loading={createMutation.isPending || updateMutation.isPending}>
            儲存
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
    
    if (!formData) return null;
    const isViewMode = !isEditing;
    const currentStatus = getDocumentStatus(formData);
    const isConfirmed = currentStatus === 'CONFIRMED' || currentStatus === 'CLOSED';
    
    return (
      <Space>
        {isViewMode && !isConfirmed && (
          <Button key="edit" type="primary" onClick={(e: any) => { e.preventDefault(); setIsEditing(true); }}>
            編輯主檔
          </Button>
        )}
      </Space>
    );
  };


  let steps: any[] = [];
  if (formData) {
    const currentStatus = getDocumentStatus(formData);
    steps = [
      {
        title: '準備中',
        status: currentStatus !== 'UNCONFIRMED' ? 'finish' : 'process',
        date: formData.createdAt,
        user: formData.createdBy,
      },
      {
        title: '入庫確認',
        status: currentStatus === 'UNCONFIRMED' ? 'wait' : 'finish',
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
          statusTag={formData ? getStatusTag(formData.status, formData.confirmDate, formData.closeDate) : undefined}
        />
      }
      placement="right"
      size={DRAWER_WIDTH_MAIN as any}
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
        <div className="py-2 px-6">
          {(!isCreating && formData) && <DocumentLifecycleBanner steps={steps} />}
          <MasterDetailTabs
            heightOffset={(!isCreating && formData) ? 320 : 160}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isCreateMode={isCreating}
          isEditMode={isEditing}
          viewId={id}
          masterContent={
            <DynamicForm
              formId="production-receipt-form"
              fields={mainFormConfig() as any}
              defaultValues={defaultValues}
              onSubmit={handleFinish}
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
