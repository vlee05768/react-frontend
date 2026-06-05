import { useState, useMemo, useRef, useEffect } from 'react';
import { Drawer, Space, Button, App, Spin, Empty } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircleOutlined, SyncOutlined, LockOutlined, UnlockOutlined, DeleteOutlined } from '@ant-design/icons';
import { ActionButton } from '@/components/common/ActionButton';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { 
  getApiV1PurchaseOrderByCode, 
  postApiV1PurchaseOrder, 
  putApiV1PurchaseOrderByCode,
  postApiV1PurchaseOrderByCodeConfirm,
  postApiV1PurchaseOrderByCodeCancelConfirm,
  postApiV1PurchaseOrderByCodeForceClose,
  postApiV1PurchaseOrderByCodeCancelClose,
  deleteApiV1PurchaseOrderByCode
} from '@/api/generated/sdk.gen';
import { DynamicForm } from '@/components/Form/DynamicForm';
import { DrawerTitle } from '@/components/Form/DrawerTitle';
import { ActionBar } from '@/components/common/ActionBar';
import { DocumentLifecycleBanner } from '@/components/common/DocumentLifecycleBanner';
import { MasterDetailTabs } from '@/components/Form/MasterDetailTabs';
import { useAuthStore } from '@/stores/useAuthStore';
import type { PurchaseOrderDto, CreatePurchaseOrderDto, UpdatePurchaseOrderDto } from '@/api/generated/types.gen';
import { DRAWER_WIDTH_MAIN } from '@/constants/ui';
import { getFormConfig, getStatusTag } from './PurchaseOrderConfig';
import PurchaseOrderItemsTab from './PurchaseOrderItemsTab';
import { DocumentWatchButton } from '@/components/common/DocumentWatchButton';
import { getApiErrorMessage } from '@/utils/apiError';

export default function PurchaseOrderDrawer() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const { hasPermission } = useAuthStore();

  const isCreating = id === 'create';
  const [isEditing, setIsEditing] = useState(isCreating);
  const [activeTab, setActiveTab] = useState('master_info');
  const [isDetailEditing, setIsDetailEditing] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['purchase-order', id],
    queryFn: () => getApiV1PurchaseOrderByCode({ path: { code: id! } }),
    enabled: !isCreating && !!id,
    retry: false,
    refetchInterval: 30000,
  });

  const purchaseOrderData: PurchaseOrderDto | undefined = (data?.data?.data as any) || undefined;

  const isViewMode = !isEditing && !isCreating && !isDetailEditing;
  const hasAutoSwitchedRef = useRef(false);

  useEffect(() => {
    hasAutoSwitchedRef.current = false;
  }, [id]);
  
  useEffect(() => {
    if (!isLoading && purchaseOrderData && !hasAutoSwitchedRef.current && isViewMode) {
      hasAutoSwitchedRef.current = true;
      if (!purchaseOrderData.purchaseOrderItems || purchaseOrderData.purchaseOrderItems.length === 0) {
        setActiveTab('items');
      }
    }
  }, [isLoading, purchaseOrderData, isViewMode]);

  const defaultValues = useMemo(() => {
    if (isCreating) {
      return {
        code: '【系統自動編碼】',
        ticketDate: dayjs(),
        expectedArrivalDate: dayjs().add(1, 'week'),
        status: 'Draft',
        targetPlantCode: 'TW',
        currency: 'TWD',
        exchangeRate: 1,
        taxRate: 0.05,
        taxType: 'Taxable',
      };
    }
    if (purchaseOrderData) {
      return {
        ...purchaseOrderData,
        ticketDate: purchaseOrderData.ticketDate ? dayjs(purchaseOrderData.ticketDate) : undefined,
        expectedArrivalDate: purchaseOrderData.expectedArrivalDate ? dayjs(purchaseOrderData.expectedArrivalDate) : undefined,
      };
    }
    return undefined;
  }, [isCreating, purchaseOrderData]);

  const createMutation = useMutation({
    mutationFn: (data: CreatePurchaseOrderDto) => postApiV1PurchaseOrder({ body: data }),
    onSuccess: (res) => {
      message.success('新增成功');
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      const newCode = (res.data as any)?.data?.code || (res.data as any)?.code;
      if (newCode) {
        setTimeout(() => {
           setActiveTab('items');
        }, 100);
        navigate(`/purchase/orders/${newCode}`, { replace: true });
        setIsEditing(false);
      }
    },
    onError: (error) => {
      modal.error({ centered: true, title: '錯誤提示', content: `新增失敗: ${getApiErrorMessage(error)}` });
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdatePurchaseOrderDto) => putApiV1PurchaseOrderByCode({ path: { code: id! }, body: data }),
    onSuccess: () => {
      message.success('更新成功');
      queryClient.invalidateQueries({ queryKey: ['purchase-order', id] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      setIsEditing(false);
    },
    onError: (error) => {
      modal.error({ centered: true, title: '錯誤提示', content: `更新失敗: ${getApiErrorMessage(error)}` });
    }
  });

  const confirmMutation = useMutation({
    mutationFn: () => postApiV1PurchaseOrderByCodeConfirm({ path: { code: id! } }),
    onSuccess: () => {
      message.success('確認成功');
      queryClient.invalidateQueries({ queryKey: ['purchase-order', id] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
    onError: (error) => {
      modal.error({ centered: true, title: '錯誤提示', content: `確認失敗: ${getApiErrorMessage(error)}` });
    }
  });

  const cancelConfirmMutation = useMutation({
    mutationFn: () => postApiV1PurchaseOrderByCodeCancelConfirm({ path: { code: id! } }),
    onSuccess: () => {
      message.success('取消確認成功');
      queryClient.invalidateQueries({ queryKey: ['purchase-order', id] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
    onError: (error) => {
      modal.error({ centered: true, title: '錯誤提示', content: `取消確認失敗: ${getApiErrorMessage(error)}` });
    }
  });

  const closeMutation = useMutation({
    mutationFn: () => postApiV1PurchaseOrderByCodeForceClose({ path: { code: id! } }),
    onSuccess: () => {
      message.success('結案成功');
      queryClient.invalidateQueries({ queryKey: ['purchase-order', id] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
    onError: (error) => {
      modal.error({ centered: true, title: '錯誤提示', content: `結案失敗: ${getApiErrorMessage(error)}` });
    }
  });

  const cancelCloseMutation = useMutation({
    mutationFn: () => postApiV1PurchaseOrderByCodeCancelClose({ path: { code: id! } }),
    onSuccess: () => {
      message.success('取消結案成功');
      queryClient.invalidateQueries({ queryKey: ['purchase-order', id] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
    onError: (error) => {
      modal.error({ centered: true, title: '錯誤提示', content: `取消結案失敗: ${getApiErrorMessage(error)}` });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteApiV1PurchaseOrderByCode({ path: { code: id! } }),
    onSuccess: () => {
      message.success('刪除成功');
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      navigate('/purchase/orders', { replace: true });
    },
    onError: (error) => {
      modal.error({ centered: true, title: '錯誤提示', content: `刪除失敗: ${getApiErrorMessage(error)}` });
    }
  });

  const handleSubmit = async (values: any) => {
    const formattedValues = {
      ...values,
      targetPlantCode: 'TW',
      ticketDate: values.ticketDate ? dayjs(values.ticketDate).format('YYYY-MM-DD') : undefined,
      expectedArrivalDate: values.expectedArrivalDate ? dayjs(values.expectedArrivalDate).format('YYYY-MM-DD') : undefined,
    };

    try {
      if (isCreating) {
        if (formattedValues.code === '【系統自動編碼】') {
          delete formattedValues.code;
        }
        await createMutation.mutateAsync(formattedValues as CreatePurchaseOrderDto);
      } else {
        await updateMutation.mutateAsync(formattedValues as UpdatePurchaseOrderDto);
      }
    } catch (e) {
      // 錯誤已在 mutation onError 中處理
    }
  };

  const handleClose = () => {
    if (isEditing && !isCreating) {
      setIsEditing(false);
    } else {
      navigate('/purchase/orders');
    }
  };
  
  const getHeaderActions = () => {
    const statusUpper = (purchaseOrderData?.status || '').toUpperCase();
    const isDraft = statusUpper === 'DRAFT';
    const isConfirmed = statusUpper === 'CONFIRMED';
    const isFinished = statusUpper === 'CLOSED' || statusUpper === 'FINISHED' || !!purchaseOrderData?.closedAt;
    const canUpdate = hasPermission('Purchase.Orders.Update');
    const canDelete = hasPermission('Purchase.Orders.Delete');
    const hasItems = purchaseOrderData?.purchaseOrderItems && purchaseOrderData.purchaseOrderItems.length > 0;

    if (isCreating || isEditing) return null;
    if (!purchaseOrderData) return null;

    return (
      <Space>
        <DocumentWatchButton documentType="PurchaseOrder" documentKey={purchaseOrderData?.code} />
        {canUpdate && isDraft && (
          <ActionButton 
            key="confirm"
            intent="success" 
            icon={<CheckCircleOutlined />} 
            disabled={isDetailEditing || !hasItems}
            loading={confirmMutation.isPending}
            onClick={(e) => {
              e.preventDefault();
              if (!hasItems) {
                message.error('沒有任何採購明細，無法確認單據');
                return;
              }
              modal.confirm({
                title: '確認單據',
                content: '確定要確認此單據嗎？',
                centered: true,
                width: 400,
                onOk: () => { confirmMutation.mutate(); },
              })
            }}
          >
            確認單據
          </ActionButton>
        )}
        
        {canDelete && isDraft && (
          <ActionButton 
            key="delete"
            intent="error" 
            icon={<DeleteOutlined />} 
            disabled={isDetailEditing}
            loading={deleteMutation.isPending}
            onClick={(e) => {
              e.preventDefault();
              modal.confirm({
                title: '刪除單據',
                content: `確定要刪除採購單 ${purchaseOrderData.code} 嗎？`,
                centered: true,
                width: 400,
                okButtonProps: { danger: true },
                onOk: () => { deleteMutation.mutate(); },
              })
            }}
          >
            刪除
          </ActionButton>
        )}
        
        {canUpdate && isConfirmed && (
          <ActionButton 
            key="close"
            intent="success" 
            icon={<LockOutlined />} 
            disabled={isDetailEditing}
            loading={closeMutation.isPending}
            onClick={(e) => {
              e.preventDefault();
              modal.confirm({
                title: '單據結案',
                content: '確定要將此單據結案嗎？',
                centered: true,
                width: 400,
                onOk: () => { closeMutation.mutate(); },
              })
            }}
          >
            結案
          </ActionButton>
        )}

        {canUpdate && isConfirmed && (
          <ActionButton 
            key="cancel-confirm"
            intent="warning" 
            icon={<SyncOutlined />} 
            disabled={isDetailEditing}
            loading={cancelConfirmMutation.isPending}
            onClick={(e) => {
              e.preventDefault();
              modal.confirm({
                title: '取消確認',
                content: '確定要取消確認此單據嗎？',
                centered: true,
                width: 400,
                onOk: () => { cancelConfirmMutation.mutate(); },
              })
            }}
          >
            取消確認
          </ActionButton>
        )}

        {canUpdate && isFinished && (
          <span>
            <ActionButton 
              key="cancel-close"
              intent="warning" 
              icon={<UnlockOutlined />} 
              disabled={isDetailEditing}
              loading={cancelCloseMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                modal.confirm({
                  title: '取消結案',
                  content: '確定要取消結案此單據嗎？',
                  centered: true,
                  width: 400,
                  onOk: () => { cancelCloseMutation.mutate(); },
                })
              }}
            >
              取消結案
            </ActionButton>
          </span>
        )}
      </Space>
    );
  };

  const getActionBarActions = () => {
    if (isCreating || isEditing) {
      return (
        <Space>
          <Button 
            key="save" 
            type="primary" 
            onClick={() => {
              const submitBtn = document.getElementById("purchaseOrderForm-submit-btn");
              if (submitBtn) {
                (submitBtn as HTMLButtonElement).click();
              } else {
                (document.getElementById("purchaseOrderForm") as HTMLFormElement)?.requestSubmit();
              }
            }} 
            loading={createMutation.isPending || updateMutation.isPending}
          >
            儲存
          </Button>
          <Button key="cancel" onClick={handleClose}>取消</Button>
        </Space>
      );
    }

    if (!purchaseOrderData) return null;

    const isDraft = (purchaseOrderData?.status || '').toUpperCase() === 'DRAFT';
    const canUpdate = hasPermission('Purchase.Orders.Update');

    return (
      <Space>
        {canUpdate && isDraft && (
          <Button 
            key="edit" 
            type="primary" 
            onClick={(e) => { e.preventDefault(); setIsEditing(true); }} 
            disabled={isDetailEditing}
          >
            編輯
          </Button>
        )}
      </Space>
    );
  };

  let steps: any[] = [];
  if (purchaseOrderData) {
    const statusUpper = (purchaseOrderData.status || '').toUpperCase();
    steps = [
      {
        title: '準備中',
        status: statusUpper !== 'DRAFT' ? 'finish' : 'process',
        date: purchaseOrderData.createdAt,
        user: purchaseOrderData.createdBy,
      },
      {
        title: '單據確認',
        status: statusUpper === 'DRAFT' ? 'wait' : (statusUpper === 'CONFIRMED' ? 'process' : 'finish'),
        date: purchaseOrderData.confirmedAt,
        user: purchaseOrderData.confirmedBy,
      },
      {
        title: '單據結案',
        status: (statusUpper !== 'CLOSED' && statusUpper !== 'FINISHED') ? 'wait' : 'finish',
        date: purchaseOrderData.closedAt,
        user: purchaseOrderData.closedBy,
      }
    ];
  }

  const drawerStyles = {
    body: { padding: 0, overflow: 'hidden' as const }
  };

  return (
    <Drawer
      styles={drawerStyles}
      title={
        <DrawerTitle
          moduleName="採購單"
          isCreate={isCreating}
          isEdit={isEditing}
          record={purchaseOrderData}
          displayField={(r: PurchaseOrderDto) => r?.code ? `${r.code}` : ''}
          statusTag={(!isCreating && purchaseOrderData) ? getStatusTag(purchaseOrderData.status, purchaseOrderData.closedAt) : undefined}
        />
      }
      open={true}
      onClose={() => navigate('/purchase/orders')}
      size={DRAWER_WIDTH_MAIN as any}
      extra={getHeaderActions()}
      mask={{ closable: isViewMode }}
      keyboard={isViewMode}
    >
      <Spin spinning={isLoading}>
        <ActionBar 
          createdBy={purchaseOrderData?.createdBy || undefined}
          createdAt={purchaseOrderData?.createdAt || undefined}
          updatedBy={purchaseOrderData?.updatedBy || undefined}
          updatedAt={purchaseOrderData?.updatedAt || undefined}
          actions={getActionBarActions()}
        />
        <div className="py-2 px-6">
          {!isCreating && purchaseOrderData && <DocumentLifecycleBanner steps={steps} />}
          <MasterDetailTabs
            heightOffset={!isCreating && purchaseOrderData ? 320 : 160}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            isCreateMode={isCreating}
            isEditMode={isEditing}
            viewId={id}
            disableTabSwitching={isDetailEditing}
            masterContent={
              <div style={{ display: activeTab === 'master_info' ? 'block' : 'none' }}>
                <DynamicForm
                  formId="purchaseOrderForm"
                  fields={getFormConfig()}
                  defaultValues={defaultValues}
                  isViewMode={!isEditing && !isCreating}
                  isUpdateMode={!isCreating}
                  hideDefaultFooter={true}
                  onSubmit={handleSubmit}
                />
              </div>
            }
            detailTabs={[
              {
                key: 'items',
                label: '採購明細',
                children: !isCreating && purchaseOrderData ? (
                  <PurchaseOrderItemsTab 
                    purchaseOrderData={purchaseOrderData} 
                    isMasterViewMode={isViewMode} 
                    onEditingChange={setIsDetailEditing}
                  />
                ) : (
                  <Empty description="請先儲存採購單主檔" />
                )
              }
            ]}
          />
        </div>
      </Spin>
    </Drawer>
  );
}
