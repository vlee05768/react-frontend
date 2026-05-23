import { useState, useMemo, useRef, useEffect } from 'react';
import { Drawer, Space, Button, App, Spin, Empty, Tooltip } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircleOutlined, SyncOutlined, LockOutlined, UnlockOutlined } from '@ant-design/icons';
import { ActionButton } from '@/components/common/ActionButton';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { 
  getApiV1OrdersByOrderNumber, 
  postApiV1Orders, 
  putApiV1OrdersByOrderNumber,
  postApiV1OrdersByOrderNumberConfirm,
  postApiV1OrdersByOrderNumberCancelConfirm,
  postApiV1OrdersByOrderNumberClose,
  postApiV1OrdersByOrderNumberCancelClose
} from '@/api/generated/sdk.gen';
import { DynamicForm } from '@/components/Form/DynamicForm';
import { DrawerTitle } from '@/components/Form/DrawerTitle';
import { ActionBar } from '@/components/common/ActionBar';
import { DocumentLifecycleBanner } from '@/components/common/DocumentLifecycleBanner';
import { MasterDetailTabs } from '@/components/Form/MasterDetailTabs';
import { useAuthStore } from '@/stores/useAuthStore';
import type { OrderDto, CreateOrderDto, UpdateOrderDto } from '@/api/generated/types.gen';
import { DRAWER_WIDTH_MAIN } from '@/constants/ui';
import { getFormConfig, getStatusTag } from './OrderConfig';
import OrderItemsTab from './OrderItemsTab';

import { getApiErrorMessage } from '@/utils/apiError';

export default function OrderDrawer() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { hasPermission } = useAuthStore();

  const isCreating = id === 'create';
  const [isEditing, setIsEditing] = useState(isCreating);
  const [activeTab, setActiveTab] = useState('master_info');
  const [isDetailEditing, setIsDetailEditing] = useState(false);


  const { data, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => getApiV1OrdersByOrderNumber({ path: { orderNumber: id! } }),
    enabled: !isCreating && !!id,
    retry: false,
    refetchInterval: 30000,
  });

  const orderData: OrderDto | undefined = (data?.data?.data as any) || undefined;

  const isViewMode = !isEditing && !isCreating && !isDetailEditing;
  const hasAutoSwitchedRef = useRef(false);

  useEffect(() => {
    hasAutoSwitchedRef.current = false;
  }, [id]);
  
  useEffect(() => {
    // If we just successfully created an order, activeTab should be 'items'. We can just use the state from navigate if we passed it, but actually let's just do it directly.
    if (!isLoading && orderData && !hasAutoSwitchedRef.current && isViewMode) {
      hasAutoSwitchedRef.current = true;
      if (!orderData.orderItems || orderData.orderItems.length === 0) {
        setActiveTab('items');
      }
    }
  }, [isLoading, orderData, isViewMode]);


  const defaultValues = useMemo(() => {
    if (isCreating) {
      return {
        orderNumber: '【系統自動編碼】',
        orderDate: dayjs(),
        requestedDeliveryDate: dayjs().add(1, 'month'),
        promisedDeliveryDate: dayjs().add(1, 'month'),
        salespersonEmployeeCode: user?.employeeCode || undefined,
      };
    }
    if (orderData) {
      return {
        ...orderData,
        orderDate: orderData.orderDate ? dayjs(orderData.orderDate) : undefined,
        requestedDeliveryDate: orderData.requestedDeliveryDate ? dayjs(orderData.requestedDeliveryDate) : undefined,
        promisedDeliveryDate: orderData.promisedDeliveryDate ? dayjs(orderData.promisedDeliveryDate) : undefined,
      };
    }
    return undefined;
  }, [isCreating, orderData, user]);

  const createMutation = useMutation({
    mutationFn: (data: CreateOrderDto) => postApiV1Orders({ body: data }),
    onSuccess: (res) => {
      message.success('新增成功');
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      const newOrderNum = (res.data as any)?.data?.orderNumber || (res.data as any)?.orderNumber;
      if (newOrderNum) {
        // 使用 setTimeout 確保 navigation 完成後才切換 tab
        setTimeout(() => {
           setActiveTab('items');
        }, 100);
        navigate(`/sales/orders/${newOrderNum}`, { replace: true });
        setIsEditing(false);
      }
    },
    onError: (error) => {
      modal.error({ centered: true, title: '錯誤提示', content: `新增失敗: ${getApiErrorMessage(error)}` });
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateOrderDto) => putApiV1OrdersByOrderNumber({ path: { orderNumber: id! }, body: data }),
    onSuccess: () => {
      message.success('更新成功');
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setIsEditing(false);
    },
    onError: (error) => {
      modal.error({ centered: true, title: '錯誤提示', content: `更新失敗: ${getApiErrorMessage(error)}` });
    }
  });
  const confirmMutation = useMutation({
    mutationFn: () => postApiV1OrdersByOrderNumberConfirm({ path: { orderNumber: id! } }),
    onSuccess: () => {
      message.success('確認成功');
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (error) => {
      modal.error({ centered: true, title: '錯誤提示', content: `確認失敗: ${getApiErrorMessage(error)}` });
    }
  });

  const cancelConfirmMutation = useMutation({
    mutationFn: () => postApiV1OrdersByOrderNumberCancelConfirm({ path: { orderNumber: id! } }),
    onSuccess: () => {
      message.success('取消確認成功');
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (error) => {
      modal.error({ centered: true, title: '錯誤提示', content: `取消確認失敗: ${getApiErrorMessage(error)}` });
    }
  });

  const closeMutation = useMutation({
    mutationFn: () => postApiV1OrdersByOrderNumberClose({ path: { orderNumber: id! } }),
    onSuccess: () => {
      message.success('結案成功');
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (error) => {
      modal.error({ centered: true, title: '錯誤提示', content: `結案失敗: ${getApiErrorMessage(error)}` });
    }
  });

  const cancelCloseMutation = useMutation({
    mutationFn: () => postApiV1OrdersByOrderNumberCancelClose({ path: { orderNumber: id! } }),
    onSuccess: () => {
      message.success('取消結案成功');
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (error) => {
      modal.error({ centered: true, title: '錯誤提示', content: `取消結案失敗: ${getApiErrorMessage(error)}` });
    }
  });


  const handleSubmit = async (values: any) => {
    const formattedValues = {
      ...values,
      orderDate: values.orderDate ? dayjs(values.orderDate).format('YYYY-MM-DD') : undefined,
      requestedDeliveryDate: values.requestedDeliveryDate ? dayjs(values.requestedDeliveryDate).format('YYYY-MM-DD') : undefined,
      promisedDeliveryDate: values.promisedDeliveryDate ? dayjs(values.promisedDeliveryDate).format('YYYY-MM-DD') : undefined,
    };

    try {
      if (isCreating) {
        // 如果是自動編碼的顯示文字，在送出前移除它避免後端驗證報錯
        if (formattedValues.orderNumber === '【系統自動編碼】') {
          delete formattedValues.orderNumber;
        }
        await createMutation.mutateAsync(formattedValues as CreateOrderDto);
      } else {
        await updateMutation.mutateAsync(formattedValues as UpdateOrderDto);
      }
    } catch (e) {
      // 錯誤已在 mutation onError 中處理
    }
  };

  const handleClose = () => {
    if (isEditing && !isCreating) {
      setIsEditing(false);
    } else {
      navigate('/sales/orders');
    }
  };


  
  const getHeaderActions = () => {
    const isDraft = orderData?.status === 'Draft';
    const isConfirmed = orderData?.status === 'Confirmed';
    const isFinished = orderData?.status === 'Finished';
    const canUpdate = hasPermission('Sales.Orders.Update');
    const hasItems = orderData?.orderItems && orderData.orderItems.length > 0;
    const hasCancelledQty = orderData?.orderItems?.some(
      item => (item.quantityCancelled ?? 0) > 0
    ) ?? false;

    if (isCreating || isEditing) return null;
    if (!orderData) return null;

    return (
      <Space>
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
                message.error('沒有任何訂單明細，無法確認單據');
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
          <Tooltip title={!hasCancelledQty ? "訂單明細沒有任何取消量，不可取消結案" : undefined}>
            <span>
              <ActionButton 
                key="cancel-close"
                intent="warning" 
                icon={<UnlockOutlined />} 
                disabled={isDetailEditing || !hasCancelledQty}
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
          </Tooltip>
        )}
      </Space>
    );
  };

  const getActionBarActions = () => {
    if (isCreating || isEditing) {
      return (
        <Space>
          <Button key="save" type="primary" onClick={() => (document.getElementById("orderForm") as HTMLFormElement)?.requestSubmit()} loading={createMutation.isPending || updateMutation.isPending}>儲存</Button>
          <Button key="cancel" onClick={handleClose}>取消</Button>
        </Space>
      );
    }

    if (!orderData) return null;

    const isDraft = orderData?.status === 'Draft';
    const canUpdate = hasPermission('Sales.Orders.Update');

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
  if (orderData) {
    steps = [
      {
        title: '準備中',
        status: orderData.status !== 'Draft' ? 'finish' : 'process',
        date: orderData.createdAt,
        user: orderData.createdBy,
      },
      {
        title: '單據確認',
        status: orderData.status === 'Draft' ? 'wait' : (orderData.status === 'Confirmed' ? 'process' : 'finish'),
        date: orderData.confirmDate,
        user: orderData.confirmUserName,
      },
      {
        title: '單據結案',
        status: orderData.status !== 'Finished' ? 'wait' : 'finish',
        date: orderData.closeDate,
        user: orderData.closeUserName,
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
          moduleName="訂單"
          isCreate={isCreating}
          isEdit={isEditing}
          record={orderData}
          displayField={(r: OrderDto) => r?.orderNumber ? `${r.orderNumber}` : ''}
          statusTag={(!isCreating && orderData) ? getStatusTag(orderData.status) : undefined}
        />
      }
      open={true}
      onClose={() => navigate('/sales/orders')}
      size={DRAWER_WIDTH_MAIN as any}
      extra={getHeaderActions()}
      mask={{ closable: isViewMode }}
      keyboard={isViewMode}
    >
      <Spin spinning={isLoading}>
        <ActionBar 
            createdBy={orderData?.createdBy || undefined}
            createdAt={orderData?.createdAt || undefined}
            updatedBy={orderData?.updatedBy || undefined}
            updatedAt={orderData?.updatedAt || undefined}
            actions={getActionBarActions()}
          />
        <div className="py-2 px-6">
          {!isCreating && orderData && <DocumentLifecycleBanner steps={steps} />}
          <MasterDetailTabs
            heightOffset={!isCreating && orderData ? 320 : 160}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            isCreateMode={isCreating}
            isEditMode={isEditing}
            viewId={id}
            disableTabSwitching={isDetailEditing}
            masterContent={
              <div style={{ display: activeTab === 'master_info' ? 'block' : 'none' }}>
                <DynamicForm
                  formId="orderForm"
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
                label: '訂單明細',
                children: !isCreating && orderData ? (
                  <OrderItemsTab 
                    orderData={orderData} 
                    isMasterViewMode={isViewMode} 
                    onEditingChange={setIsDetailEditing}
                  />
                ) : (
                  <Empty description="請先儲存訂單主檔" />
                )
              }
            ]}
          />
        </div>
      </Spin>
    </Drawer>
  );
}
