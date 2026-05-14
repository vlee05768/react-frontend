import { useState, useMemo, useEffect } from 'react';
import { Drawer, Space, Button, App, Spin, Empty } from 'antd';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { CheckCircleOutlined, SyncOutlined, LockOutlined, UnlockOutlined, FilePdfOutlined } from '@ant-design/icons';
import { ActionButton } from '@/components/common/ActionButton';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { 
  getApiV1SalesDeliveryByMovementNumber, 
  postApiV1SalesDelivery, 
  putApiV1SalesDeliveryByMovementNumber,
  postApiV1SalesDeliveryByMovementNumberConfirm,
  postApiV1SalesDeliveryByMovementNumberCancelConfirm,
  postApiV1SalesDeliveryByMovementNumberClose,
  postApiV1SalesDeliveryByMovementNumberCancelClose,
  getApiV1SalesDeliveryByMovementNumberSalesDeliveryReport
} from '@/api/generated/sdk.gen';
import { DynamicForm } from '@/components/Form/DynamicForm';
import { DrawerTitle } from '@/components/Form/DrawerTitle';
import { ActionBar } from '@/components/common/ActionBar';
import { DocumentLifecycleBanner } from '@/components/common/DocumentLifecycleBanner';
import { MasterDetailTabs } from '@/components/Form/MasterDetailTabs';
import { useAuthStore } from '@/stores/useAuthStore';
import type { SalesDeliveryDto } from '@/api/generated/types.gen';
import { DRAWER_WIDTH_MAIN } from '@/constants/ui';
import { getFormConfig, getStatusTag } from './SalesDeliveryConfig';
import SalesDeliveryItemsTab from './SalesDeliveryItemsTab';

import { getApiErrorMessage } from '@/utils/apiError';

export default function SalesDeliveryDrawer() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  
  const { hasPermission, user } = useAuthStore();

  const isCreating = id === 'create';
  const [isEditing, setIsEditing] = useState(isCreating);
  const [activeTab, setActiveTab] = useState('master_info');
  const [isSaving, setIsSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['salesdelivery', id],
    queryFn: () => getApiV1SalesDeliveryByMovementNumber({ path: { movementNumber: id! } }),
    enabled: !isCreating && !!id,
    retry: false,
    refetchInterval: 30000,
  });

  const deliveryData: SalesDeliveryDto | undefined = (data?.data?.data as any) || undefined;

  const [hasAutoSwitchedTab, setHasAutoSwitchedTab] = useState(false);

  // 1. 若是剛建立完主檔（透過 location.state.autoEdit 傳遞），自動開啟編輯模式
  useEffect(() => {
    if (!isCreating && deliveryData && location.state?.autoEdit) {
      setIsEditing(true);
      // 清除 state 避免重整後又進入編輯模式
      navigate('.', { replace: true, state: {} });
    }
  }, [isCreating, deliveryData?.documentNumber, location.state]);

  // 2. 開啟銷貨單時，如果沒有明細，自動切換到明細 tab
  useEffect(() => {
    if (!isCreating && deliveryData && !hasAutoSwitchedTab) {
      if (!deliveryData.items || deliveryData.items.length === 0) {
        setActiveTab('items');
      }
      setHasAutoSwitchedTab(true);
    }
  }, [isCreating, deliveryData, hasAutoSwitchedTab]);

  const isViewMode = !isEditing && !isCreating;

  const getActionBarActions = () => {
    const canUpdate = hasPermission('Sales.Deliveries.Update');
    if (isCreating || isEditing) {
      return (
        <Space>
          <Button key="save" type="primary" onClick={() => (document.getElementById("salesDeliveryForm") as HTMLFormElement)?.requestSubmit()} loading={isSaving}>儲存</Button>
          <Button key="cancel" onClick={() => {
            if (isCreating) navigate('/sales/salesdeliveries');
            else setIsEditing(false);
          }}>取消</Button>
        </Space>
      );
    }
    
    if (canUpdate && deliveryData && !deliveryData.confirmDate) {
      return (
        <Space>
          <Button key="edit" type="primary" onClick={(e) => { e.preventDefault(); setIsEditing(true); }}>編輯</Button>
        </Space>
      );
    }
    
    return null;
  };

  const getHeaderActions = () => {
    const canUpdate = hasPermission('Sales.Deliveries.Update');
    
    if (isCreating || isEditing) return null;
    if (!deliveryData) return null;

    const isConfirmed = !!deliveryData.confirmDate;
    const isClosed = !!deliveryData.closeDate;

    return (
      <Space>
        {!isConfirmed && canUpdate && (
          <ActionButton 
            key="confirm" intent="success" icon={<CheckCircleOutlined />} 
            onClick={(e) => {
              e.preventDefault();
              modal.confirm({
                title: '確認銷貨單',
                content: '確定要確認此銷貨單嗎？',
                onOk: async () => {
                  try {
                    await postApiV1SalesDeliveryByMovementNumberConfirm({ path: { movementNumber: id! } });
                    message.success('確認成功');
                    queryClient.invalidateQueries({ queryKey: ['salesdelivery', id] });
                  } catch(e) {
                    modal.error({ title: '錯誤', content: getApiErrorMessage(e) });
                  }
                }
              });
            }}
          >
            確認單據
          </ActionButton>
        )}
        
        {isConfirmed && !isClosed && canUpdate && (
          <ActionButton 
            key="cancelConfirm" intent="default"  icon={<SyncOutlined />} 
            onClick={(e) => {
              e.preventDefault();
              modal.confirm({
                title: '取消確認',
                content: '確定要取消確認此銷貨單嗎？',
                onOk: async () => {
                  try {
                    await postApiV1SalesDeliveryByMovementNumberCancelConfirm({ path: { movementNumber: id! } });
                    message.success('取消確認成功');
                    queryClient.invalidateQueries({ queryKey: ['salesdelivery', id] });
                  } catch(e) {
                    modal.error({ title: '錯誤', content: getApiErrorMessage(e) });
                  }
                }
              });
            }}
          >
            取消確認
          </ActionButton>
        )}
        {isConfirmed && !isClosed && canUpdate && (
          <ActionButton 
            key="close" intent="success" icon={<LockOutlined />} 
            onClick={(e) => {
              e.preventDefault();
              modal.confirm({
                title: '結案',
                content: '確定要將此銷貨單結案嗎？',
                onOk: async () => {
                  try {
                    await postApiV1SalesDeliveryByMovementNumberClose({ path: { movementNumber: id! } });
                    message.success('結案成功');
                    queryClient.invalidateQueries({ queryKey: ['salesdelivery', id] });
                  } catch(e) {
                    modal.error({ title: '錯誤', content: getApiErrorMessage(e) });
                  }
                }
              });
            }}
          >
            單據結案
          </ActionButton>
        )}
        {isClosed && canUpdate && (
          <ActionButton 
            key="cancelClose" intent="default"  icon={<UnlockOutlined />} 
            onClick={(e) => {
              e.preventDefault();
              modal.confirm({
                title: '取消結案',
                content: '確定要取消結案此銷貨單嗎？',
                onOk: async () => {
                  try {
                    await postApiV1SalesDeliveryByMovementNumberCancelClose({ path: { movementNumber: id! } });
                    message.success('取消結案成功');
                    queryClient.invalidateQueries({ queryKey: ['salesdelivery', id] });
                  } catch(e) {
                    modal.error({ title: '錯誤', content: getApiErrorMessage(e) });
                  }
                }
              });
            }}
          >
            取消結案
          </ActionButton>
        )}
        {isConfirmed && !isClosed && (
          <ActionButton
            key="print" intent="default" icon={<FilePdfOutlined />}
            onClick={async () => {
                const hide = message.loading('報表產生中...', 0);
                try {
                  const res = await getApiV1SalesDeliveryByMovementNumberSalesDeliveryReport({ path: { movementNumber: id! }, responseType: 'blob' as any });
                  const blobUrl = URL.createObjectURL(res.data as any);
                  const link = document.createElement('a');
                  link.href = blobUrl;
                  link.download = `銷貨單報表_${id}.pdf`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
                  hide();
                } catch (error) {
                  hide();
                  modal.error({ title: '錯誤', content: getApiErrorMessage(error) });
                }
            }}
          >列印報表</ActionButton>
        )}
      </Space>
    );
  };

  const handleSubmit = async (values: any) => {
    setIsSaving(true);
    try {
      const data = {
        ...values,
        documentDate: values.documentDate ? dayjs(values.documentDate).format('YYYY-MM-DD') : undefined,
      };

      if (isCreating) {
        const res = await postApiV1SalesDelivery({ body: data });
        message.success('建立成功');
        const newId = (res.data as any)?.data?.documentNumber || (res.data as any)?.documentNumber;
        if (newId) {
          navigate(`/sales/salesdeliveries/${newId}`, { replace: true, state: { autoEdit: true } });
        } else {
          navigate('/sales/salesdeliveries');
        }
      } else {
        await putApiV1SalesDeliveryByMovementNumber({ path: { movementNumber: id! }, body: data });
        message.success('更新成功');
        setIsEditing(false);
        queryClient.invalidateQueries({ queryKey: ['salesdelivery', id] });
      }
    } catch (error) {
      modal.error({ title: '儲存失敗', content: getApiErrorMessage(error) });
    } finally {
      setIsSaving(false);
    }
  };

  const defaultValues = useMemo(() => {
    if (isCreating) {
      return {
        documentDate: dayjs(),
        responsibleEmployeeCode: user?.employeeCode,
        subTotal: 0,
        taxAmount: 0,
        totalAmount: 0,
      };
    }
    if (!deliveryData) return {};
    return {
      ...deliveryData,
      documentDate: deliveryData.documentDate ? dayjs(deliveryData.documentDate) : undefined,
    };
  }, [isCreating, deliveryData]);

  const items = useMemo(() => {
      // For items list from deliveryData
      // Assuming GET /api/v1/SalesDelivery/{movementNumber}/items provides items or they are embedded
      // By checking API types, usually it's embedded or we query it. 
      // If it's embedded:
      return (deliveryData as any)?.items || [];
  }, [deliveryData]);


  let steps: any[] = [];
  if (deliveryData) {
    steps = [
      {
        title: '準備中',
        status: deliveryData.confirmDate ? 'finish' : 'process',
        date: deliveryData.createdAt,
        user: deliveryData.createdBy,
      },
      {
        title: '單據確認',
        status: !deliveryData.confirmDate ? 'wait' : (deliveryData.closeDate ? 'finish' : 'process'),
        date: deliveryData.confirmDate,
        user: deliveryData.confirmUserName,
      },
      {
        title: '單據結案',
        status: !deliveryData.closeDate ? 'wait' : 'finish',
        date: deliveryData.closeDate,
        user: deliveryData.closeUserName,
      }
    ];
  }

  return (
    <Drawer
      styles={{ body: { padding: 0, overflow: 'hidden' as const } }}
      title={
        <DrawerTitle
          moduleName="銷貨單"
          isCreate={isCreating}
          isEdit={isEditing}
          record={deliveryData}
          displayField={(r: SalesDeliveryDto) => r?.documentNumber ? `${r.documentNumber}` : ''}
          statusTag={(!isCreating && deliveryData) ? getStatusTag(deliveryData) : undefined}
        />
      }
      open={true}
      onClose={() => navigate('/sales/salesdeliveries')}
      size={DRAWER_WIDTH_MAIN as any}
      extra={getHeaderActions()}
      mask={{ closable: isViewMode }}
      keyboard={isViewMode}
    >
      <Spin spinning={isLoading}>
        <ActionBar 
          createdBy={deliveryData?.createdBy || undefined}
          createdAt={deliveryData?.createdAt || undefined}
          updatedBy={deliveryData?.updatedBy || undefined}
          updatedAt={deliveryData?.updatedAt || undefined}
          actions={getActionBarActions()}
        />
        <div className="p-[8px_24px]">
          {!isCreating && deliveryData && <DocumentLifecycleBanner steps={steps} />}
          <MasterDetailTabs
            heightOffset={!isCreating && deliveryData ? 320 : 160}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            isCreateMode={isCreating}
            isEditMode={isEditing}
            viewId={id}
            masterContent={
              <div style={{ display: activeTab === 'master_info' ? 'block' : 'none' }}>
                <DynamicForm
                  formId="salesDeliveryForm"
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
                label: '銷貨明細',
                children: !isCreating && deliveryData ? (
                  <SalesDeliveryItemsTab 
                    documentNumber={id!}
                    customerCode={deliveryData.businessPartnerCode || ''}
                    items={items}
                    isEditing={isEditing}
                    onRefresh={() => queryClient.invalidateQueries({ queryKey: ['salesdelivery', id] })}
                  />
                ) : (
                  <Empty description="請先儲存銷貨單主檔" />
                )
              }
            ]}
          />
        </div>
      </Spin>
    </Drawer>
  );
}
