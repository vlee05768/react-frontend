import { useState, useMemo, useEffect } from 'react';
import { Drawer, Space, Button, App, Spin, Empty } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircleOutlined, SyncOutlined, FilePdfOutlined } from '@ant-design/icons';
import { ActionButton } from '@/components/common/ActionButton';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { 
  getApiV1SalesDeliveryByMovementNumber, 
  postApiV1SalesDelivery, 
  putApiV1SalesDeliveryByMovementNumber,
  postApiV1SalesDeliveryByMovementNumberConfirm,
  postApiV1SalesDeliveryByMovementNumberCancelConfirm,
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
import { useFileDownload } from '@/hooks/useFileDownload';

export default function SalesDeliveryDrawer() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const { downloadFile, isDownloading } = useFileDownload();
  
  const { hasPermission, user } = useAuthStore();

  const isCreating = id === 'create';
  const [isEditing, setIsEditing] = useState(isCreating);
  const [isDetailEditing, setIsDetailEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('master_info');
  const [isSaving, setIsSaving] = useState(false);
  const [hasAutoSwitchedTab, setHasAutoSwitchedTab] = useState(false);

  // 當 id 改變時（例如從 create 導向新建的單號），重置相關狀態
  useEffect(() => {
    setIsEditing(id === 'create');
    setHasAutoSwitchedTab(false);
    setActiveTab('master_info');
  }, [id]);

  const { data, isLoading } = useQuery({
    queryKey: ['salesdelivery', id],
    queryFn: () => getApiV1SalesDeliveryByMovementNumber({ path: { movementNumber: id! } }),
    enabled: !isCreating && !!id,
    retry: false,
    refetchInterval: 30000,
  });

  const deliveryData: SalesDeliveryDto | undefined = (data?.data?.data as any) || undefined;

  // 開啟銷貨單時，如果沒有明細，自動切換到明細 tab
  useEffect(() => {
    if (!isCreating && deliveryData && !hasAutoSwitchedTab) {
      if (!deliveryData.items || deliveryData.items.length === 0) {
        setActiveTab('items');
      }
      setHasAutoSwitchedTab(true);
    }
  }, [isCreating, deliveryData, hasAutoSwitchedTab]);

  const isViewMode = !isEditing && !isCreating && !isDetailEditing;

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
          <Button key="edit" type="primary" disabled={isDetailEditing} onClick={(e) => { e.preventDefault(); setIsEditing(true); }}>編輯</Button>
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

    return (
      <Space>
        {!isConfirmed && canUpdate && (
          <ActionButton 
            key="confirm" intent="success" icon={<CheckCircleOutlined />} 
            disabled={isDetailEditing || !hasItems}
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
        
        {isConfirmed && canUpdate && (
          <ActionButton 
            key="cancelConfirm" intent="default"  icon={<SyncOutlined />} 
            disabled={isDetailEditing}
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
        {isConfirmed && (
          <ActionButton
            key="print" intent="default" icon={<FilePdfOutlined />}
            loading={isDownloading}
            onClick={() => {
              downloadFile({
                apiFunction: () => getApiV1SalesDeliveryByMovementNumberSalesDeliveryReport({ 
                  path: { movementNumber: id! },
                  // @ts-ignore
                  responseType: 'blob'
                }),
                successMessage: '銷貨單報表已於新分頁開啟',
                openInNewTab: true
              });
            }}
          >
            列印報表
          </ActionButton>
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
          navigate(`/sales/salesdeliveries/${newId}`, { replace: true });
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

  const hasItems = items && items.length > 0;


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
        status: !deliveryData.confirmDate ? 'wait' : 'finish',
        date: deliveryData.confirmDate,
        user: deliveryData.confirmUserName,
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
            disableTabSwitching={isDetailEditing}
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
                    onEditingChange={setIsDetailEditing}
                    documentNumber={id!}
                    customerCode={deliveryData.businessPartnerCode || ''}
                    items={items}
                    isEditing={isEditing}
                    isConfirmed={!!deliveryData.confirmDate}
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
