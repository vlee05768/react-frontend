import { useState, useMemo, useRef, useEffect } from 'react';
import { Drawer, Space, Button, App, Spin, Empty } from 'antd';
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
import { MasterDetailTabs } from '@/components/Form/MasterDetailTabs';
import { useAuthStore } from '@/stores/useAuthStore';
import type { OrderDto, CreateOrderDto, UpdateOrderDto } from '@/api/generated/types.gen';
import { DRAWER_WIDTH_MAIN } from '@/constants/ui';
import { getFormConfig } from './OrderConfig';
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
  });

  const orderData: OrderDto | undefined = (data?.data?.data as any) || undefined;

  const isViewMode = !isEditing && !isCreating && !isDetailEditing;
  const hasAutoSwitchedRef = useRef(false);
  
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
      message.error(getApiErrorMessage(error, '新增失敗'));
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
      message.error(getApiErrorMessage(error, '更新失敗'));
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
      message.error(getApiErrorMessage(error, '確認失敗'));
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
      message.error(getApiErrorMessage(error, '取消確認失敗'));
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
      message.error(getApiErrorMessage(error, '結案失敗'));
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
      message.error(getApiErrorMessage(error, '取消結案失敗'));
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


  const getExtraActions = () => {
    const isDraft = orderData?.status === 'Draft';
    const isConfirmed = orderData?.status === 'Confirmed';
    const isFinished = orderData?.status === 'Finished';
    const canUpdate = hasPermission('Sales.Orders.Update');
    const hasItems = orderData?.orderItems && orderData.orderItems.length > 0;

    
    if (isCreating) {
      return (
        <Space>
          <Button onClick={handleClose}>取消</Button>
          <Button type="primary" htmlType="submit" form="orderForm" loading={createMutation.isPending}>儲存</Button>
        </Space>
      );
    }

    if (isEditing) {
      return (
        <Space>
          <Button onClick={handleClose}>取消</Button>
          <Button type="primary" htmlType="submit" form="orderForm" loading={updateMutation.isPending}>儲存</Button>
        </Space>
      );
    }

    return (
      <Space>
        {canUpdate && isDraft && (
          <ActionButton 
            intent="success" 
            icon={<CheckCircleOutlined />} 
            disabled={isDetailEditing || !hasItems}
            loading={confirmMutation.isPending}
            onClick={() => {
              if (!hasItems) {
                message.error('沒有任何訂單明細，無法確認單據');
                return;
              }
              modal.confirm({
                title: '確認單據',
                content: '確定要確認此單據嗎？',
                centered: true,
                width: 400,
                onOk: () => confirmMutation.mutateAsync(),
              })
            }}
          >
            確認
          </ActionButton>
        )}
        
        {canUpdate && isConfirmed && (
          <ActionButton 
            intent="warning" 
            icon={<SyncOutlined />} 
            disabled={isDetailEditing}
            loading={cancelConfirmMutation.isPending}
            onClick={() => modal.confirm({
              title: '取消確認',
              content: '確定要取消確認此單據嗎？',
              centered: true,
              width: 400,
              onOk: () => cancelConfirmMutation.mutateAsync(),
            })}
          >
            取消確認
          </ActionButton>
        )}

        {canUpdate && isConfirmed && (
          <ActionButton 
            intent="success" 
            icon={<LockOutlined />} 
            disabled={isDetailEditing}
            loading={closeMutation.isPending}
            onClick={() => modal.confirm({
              title: '單據結案',
              content: '確定要將此單據結案嗎？',
              centered: true,
              width: 400,
              onOk: () => closeMutation.mutateAsync(),
            })}
          >
            結案
          </ActionButton>
        )}

        {canUpdate && isFinished && (
          <ActionButton 
            intent="warning" 
            icon={<UnlockOutlined />} 
            disabled={isDetailEditing}
            loading={cancelCloseMutation.isPending}
            onClick={() => modal.confirm({
              title: '取消結案',
              content: '確定要取消結案此單據嗎？',
              centered: true,
              width: 400,
              onOk: () => cancelCloseMutation.mutateAsync(),
            })}
          >
            取消結案
          </ActionButton>
        )}

        {canUpdate && isDraft && (
          <Button type="primary" onClick={() => setIsEditing(true)} disabled={isDetailEditing}>
            編輯主檔
          </Button>
        )}
      </Space>
    );
  };

  return (
    <Drawer
      title={
        <DrawerTitle
          moduleName="訂單"
          isCreate={isCreating}
          isEdit={isEditing}
          record={orderData}
          displayField={(r: OrderDto) => r?.orderNumber ? `${r.orderNumber}` : ''}
        />
      }
      open={true}
      onClose={() => navigate('/sales/orders')}
      size={DRAWER_WIDTH_MAIN}
      extra={getExtraActions()}
      maskClosable={isViewMode}
      keyboard={isViewMode}
    >
      <Spin spinning={isLoading}>
        <MasterDetailTabs
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
      </Spin>
    </Drawer>
  );
}
