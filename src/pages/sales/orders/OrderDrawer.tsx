import { useState, useMemo } from 'react';
import { Drawer, Space, Button, App, Spin, Empty } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { 
  getApiV1OrdersByOrderNumber, 
  postApiV1Orders, 
  putApiV1OrdersByOrderNumber,
      } from '@/api/generated/sdk.gen';
import { DynamicForm } from '@/components/Form/DynamicForm';
import { DrawerTitle } from '@/components/Form/DrawerTitle';
import { MasterDetailTabs } from '@/components/Form/MasterDetailTabs';
import { useAuthStore } from '@/stores/useAuthStore';
import type { OrderDto, CreateOrderDto, UpdateOrderDto } from '@/api/generated/types.gen';
import { DRAWER_WIDTH_MAIN } from '@/constants/ui';
import { getFormConfig } from './OrderConfig';
import OrderItemsTab from './OrderItemsTab';

export default function OrderDrawer() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { message } = App.useApp();
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

  const orderData: OrderDto | undefined = (data?.data as any) || undefined;

  const defaultValues = useMemo(() => {
    if (isCreating) {
      return {
        orderDate: dayjs().format('YYYY-MM-DD'),
        requestedDeliveryDate: dayjs().add(1, 'month').format('YYYY-MM-DD'),
        promisedDeliveryDate: dayjs().add(1, 'month').format('YYYY-MM-DD'),
        salespersonEmployeeCode: user?.employeeCode || undefined,
      };
    }
    return orderData;
  }, [isCreating, orderData, user]);

  const createMutation = useMutation({
    mutationFn: (data: CreateOrderDto) => postApiV1Orders({ body: data }),
    onSuccess: (res) => {
      message.success('新增成功');
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      const newOrderNum = (res.data as any)?.orderNumber;
      if (newOrderNum) {
        navigate(`/sales/orders/${newOrderNum}`, { replace: true });
        setIsEditing(false);
        setActiveTab('items');
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateOrderDto) => putApiV1OrdersByOrderNumber({ path: { orderNumber: id! }, body: data }),
    onSuccess: () => {
      message.success('更新成功');
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setIsEditing(false);
    },
  });

  const handleSubmit = async (values: any) => {
    const formattedValues = {
      ...values,
      orderDate: values.orderDate ? dayjs(values.orderDate).format('YYYY-MM-DD') : undefined,
      requestedDeliveryDate: values.requestedDeliveryDate ? dayjs(values.requestedDeliveryDate).format('YYYY-MM-DD') : undefined,
      promisedDeliveryDate: values.promisedDeliveryDate ? dayjs(values.promisedDeliveryDate).format('YYYY-MM-DD') : undefined,
    };

    if (isCreating) {
      await createMutation.mutateAsync(formattedValues as CreateOrderDto);
    } else {
      await updateMutation.mutateAsync(formattedValues as UpdateOrderDto);
    }
  };

  const handleClose = () => {
    if (isEditing && !isCreating) {
      setIsEditing(false);
    } else {
      navigate('/sales/orders');
    }
  };

  const isViewMode = !isEditing && !isCreating && !isDetailEditing;

  const getExtraActions = () => {
    const isFinished = orderData?.status === 'Finished';
    
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
        {hasPermission('Sales.Orders.Update') && !isFinished && !isDetailEditing && (
          <Button onClick={() => setIsEditing(true)}>編輯主檔</Button>
        )}
      </Space>
    );
  };

  return (
    <Drawer
      title={
        <DrawerTitle
          moduleName={isCreating ? '訂單' : `訂單 (${id})`}
          isCreate={isCreating}
          isEdit={isEditing}
          record={orderData}
          displayField={(r: OrderDto) => r?.orderNumber ? `${r.orderNumber}` : ''}
        />
      }
      open={true}
      onClose={() => navigate('/sales/orders')}
      size={DRAWER_WIDTH_MAIN as any}
      extra={getExtraActions()}
      maskClosable={false}
    >
      <Spin spinning={isLoading}>
        <MasterDetailTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isCreateMode={isCreating}
          isEditMode={isEditing}
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
