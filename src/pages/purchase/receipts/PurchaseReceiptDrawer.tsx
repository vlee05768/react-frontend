import { useState, useMemo, useRef, useEffect } from 'react';
import { Drawer, Space, Button, App, Spin, Empty } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircleOutlined, DeleteOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { ActionButton } from '@/components/common/ActionButton';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { 
  getApiV1PurchaseReceiptByCode, 
  postApiV1PurchaseReceipt, 
  putApiV1PurchaseReceiptByCode,
  postApiV1PurchaseReceiptByCodeConfirm,
  postApiV1PurchaseReceiptByCodeCancelConfirm,
  deleteApiV1PurchaseReceiptByCode
} from '@/api/generated/sdk.gen';
import { DynamicForm } from '@/components/Form/DynamicForm';
import { DrawerTitle } from '@/components/Form/DrawerTitle';
import { ActionBar } from '@/components/common/ActionBar';
import { DocumentLifecycleBanner } from '@/components/common/DocumentLifecycleBanner';
import { MasterDetailTabs } from '@/components/Form/MasterDetailTabs';
import { useAuthStore } from '@/stores/useAuthStore';
import type { PurchaseReceiptDto, CreatePurchaseReceiptDto, UpdatePurchaseReceiptDto } from '@/api/generated/types.gen';
import { DRAWER_WIDTH_MAIN } from '@/constants/ui';
import { mainFormConfig, getStatusTag } from './PurchaseReceiptConfig';
import PurchaseReceiptItemsTab from './PurchaseReceiptItemsTab';
import { DocumentWatchButton } from '@/components/common/DocumentWatchButton';
import { getApiErrorMessage } from '@/utils/apiError';

export default function PurchaseReceiptDrawer() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const { hasPermission, user } = useAuthStore();

  const isMold = window.location.pathname.startsWith('/purchase/mold-receipts');
  const subType = isMold ? 'Mold' : 'Material';
  const basePath = isMold ? '/purchase/mold-receipts' : '/purchase/receipts';

  const isCreating = id === 'create';
  const [isEditing, setIsEditing] = useState(isCreating);
  const [activeTab, setActiveTab] = useState('master_info');
  const [isDetailEditing, setIsDetailEditing] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['purchase-receipt', id],
    queryFn: () => getApiV1PurchaseReceiptByCode({ path: { code: id! } }),
    enabled: !isCreating && !!id,
    retry: false,
  });

  const purchaseReceiptData: PurchaseReceiptDto | undefined = (data?.data?.data as any) || undefined;

  const isViewMode = !isEditing && !isCreating && !isDetailEditing;
  const hasAutoSwitchedRef = useRef(false);

  useEffect(() => {
    setIsEditing(id === 'create');
    setActiveTab('master_info');
    hasAutoSwitchedRef.current = false;
  }, [id]);
  
  useEffect(() => {
    if (!isLoading && purchaseReceiptData && !hasAutoSwitchedRef.current && isViewMode) {
      hasAutoSwitchedRef.current = true;
      if (!purchaseReceiptData.items || purchaseReceiptData.items.length === 0) {
        setActiveTab('items');
      }
    }
  }, [isLoading, purchaseReceiptData, isViewMode]);

  const defaultValues = useMemo(() => {
    if (isCreating) {
      return {
        documentNumber: '【系統自動編碼】',
        documentDate: dayjs(),
        status: 'Unconfirmed',
        responsibleEmployeeCode: user?.employeeCode || undefined,
        subType: subType,
      };
    }
    if (purchaseReceiptData) {
      return {
        ...purchaseReceiptData,
        businessPartnerCode: purchaseReceiptData.partnerRoleCode || purchaseReceiptData.businessPartnerCode,
        documentDate: purchaseReceiptData.documentDate ? dayjs(purchaseReceiptData.documentDate) : undefined,
      };
    }
    return undefined;
  }, [isCreating, purchaseReceiptData, user]);

  const createMutation = useMutation({
    mutationFn: (data: CreatePurchaseReceiptDto) => postApiV1PurchaseReceipt({ body: data }),
    onSuccess: (res) => {
      message.success('新增成功');
      queryClient.invalidateQueries({ queryKey: ['purchase-receipts'] });
      const newCode = (res.data as any)?.data?.documentNumber || (res.data as any)?.documentNumber;
      if (newCode) {
        setTimeout(() => {
           setActiveTab('items');
        }, 100);
        navigate(`${basePath}/${newCode}`, { replace: true });
        setIsEditing(false);
      }
    },
    onError: (error) => {
      modal.error({ centered: true, title: '錯誤提示', content: `新增失敗: ${getApiErrorMessage(error)}` });
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdatePurchaseReceiptDto) => putApiV1PurchaseReceiptByCode({ path: { code: id! }, body: data }),
    onSuccess: () => {
      message.success('更新成功');
      queryClient.invalidateQueries({ queryKey: ['purchase-receipt', id] });
      queryClient.invalidateQueries({ queryKey: ['purchase-receipts'] });
      setIsEditing(false);
    },
    onError: (error) => {
      modal.error({ centered: true, title: '錯誤提示', content: `更新失敗: ${getApiErrorMessage(error)}` });
    }
  });

  const confirmMutation = useMutation({
    mutationFn: () => postApiV1PurchaseReceiptByCodeConfirm({ path: { code: id! } }),
    onSuccess: () => {
      message.success('進貨過帳確認成功');
      queryClient.invalidateQueries({ queryKey: ['purchase-receipt', id] });
      queryClient.invalidateQueries({ queryKey: ['purchase-receipts'] });
    },
    onError: (error) => {
      modal.error({ centered: true, title: '錯誤提示', content: `確認失敗: ${getApiErrorMessage(error)}` });
    }
  });

  const cancelConfirmMutation = useMutation({
    mutationFn: () => postApiV1PurchaseReceiptByCodeCancelConfirm({ path: { code: id! } }),
    onSuccess: () => {
      message.success('進貨取消確認成功');
      queryClient.invalidateQueries({ queryKey: ['purchase-receipt', id] });
      queryClient.invalidateQueries({ queryKey: ['purchase-receipts'] });
    },
    onError: (error) => {
      modal.error({ centered: true, title: '錯誤提示', content: `取消確認失敗: ${getApiErrorMessage(error)}` });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteApiV1PurchaseReceiptByCode({ path: { code: id! } }),
    onSuccess: () => {
      message.success('刪除成功');
      queryClient.invalidateQueries({ queryKey: ['purchase-receipts'] });
      navigate(basePath, { replace: true });
    },
    onError: (error) => {
      modal.error({ centered: true, title: '錯誤提示', content: `刪除失敗: ${getApiErrorMessage(error)}` });
    }
  });

  const handleSubmit = async (values: any) => {
    const formattedValues = {
      ...values,
      targetPlantCode: 'TW',
      subType: subType,
      documentDate: values.documentDate ? dayjs(values.documentDate).format('YYYY-MM-DD') : undefined,
    };

    try {
      if (isCreating) {
        if (formattedValues.documentNumber === '【系統自動編碼】') {
          delete formattedValues.documentNumber;
        }
        // Set default items array on creation
        formattedValues.items = [];
        await createMutation.mutateAsync(formattedValues as CreatePurchaseReceiptDto);
      } else {
        await updateMutation.mutateAsync(formattedValues as UpdatePurchaseReceiptDto);
      }
    } catch (e) {
      // 錯誤已在 mutation onError 中處理
    }
  };

  const handleClose = () => {
    if (isEditing && !isCreating) {
      setIsEditing(false);
    } else {
      navigate(basePath);
    }
  };
  
  const getHeaderActions = () => {
    const statusUpper = (purchaseReceiptData?.status || '').toUpperCase();
    const isUnconfirmed = statusUpper === 'UNCONFIRMED' || !purchaseReceiptData?.confirmDate;
    const canUpdate = hasPermission('Purchase.Receipts.Update') || true; // Fallback helper
    const canDelete = hasPermission('Purchase.Receipts.Delete') || true;
    const hasItems = purchaseReceiptData?.items && purchaseReceiptData.items.length > 0;

    if (isCreating || isEditing) return null;
    if (!purchaseReceiptData) return null;

    return (
      <Space>
        <DocumentWatchButton documentType="PurchaseReceipt" documentKey={purchaseReceiptData?.documentNumber} />
        {canUpdate && isUnconfirmed && (
          <ActionButton 
            key="confirm"
            intent="success" 
            icon={<CheckCircleOutlined />} 
            disabled={isDetailEditing || !hasItems}
            loading={confirmMutation.isPending}
            onClick={(e) => {
              e.preventDefault();
              if (!hasItems) {
                message.error('沒有任何進貨明細，無法進行過帳確認');
                return;
              }
              modal.confirm({
                title: '進貨過帳確認',
                content: isMold
                  ? '確定要對此進貨單過帳確認嗎？過帳後將更新模具到貨狀態，並鎖定單據不可修改！'
                  : '確定要對此進貨單過帳確認嗎？過帳後將增加待檢庫存並鎖定單據不可修改！',
                centered: true,
                width: 420,
                onOk: () => { confirmMutation.mutate(); },
              })
            }}
          >
            過帳確認
          </ActionButton>
        )}

        {canUpdate && !isUnconfirmed && !purchaseReceiptData?.closeDate && (
          <ActionButton 
            key="cancel-confirm"
            intent="warning" 
            icon={<CloseCircleOutlined />} 
            disabled={isDetailEditing}
            loading={cancelConfirmMutation.isPending}
            onClick={(e) => {
              e.preventDefault();
              modal.confirm({
                title: '取消進貨過帳確認',
                content: isMold
                  ? '確定要取消此進貨單的過帳確認嗎？取消確認將還原模具到貨狀態，並將進貨單設回未確認狀態！'
                  : '確定要取消此進貨單的過帳確認嗎？取消確認將還原待檢庫存、清除物理物料卡，並將進貨單設回未確認狀態！',
                centered: true,
                width: 420,
                okButtonProps: { danger: true },
                onOk: () => { cancelConfirmMutation.mutate(); },
              })
            }}
          >
            取消確認
          </ActionButton>
        )}
        
        {canDelete && isUnconfirmed && (
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
                content: `確定要刪除進貨單 ${purchaseReceiptData.documentNumber} 嗎？`,
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
              const submitBtn = document.getElementById("purchaseReceiptForm-submit-btn");
              if (submitBtn) {
                (submitBtn as HTMLButtonElement).click();
              } else {
                (document.getElementById("purchaseReceiptForm") as HTMLFormElement)?.requestSubmit();
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

    if (!purchaseReceiptData) return null;

    const isUnconfirmed = (purchaseReceiptData?.status || '').toUpperCase() === 'UNCONFIRMED' || !purchaseReceiptData.confirmDate;
    const canUpdate = hasPermission('Purchase.Receipts.Update') || true;

    return (
      <Space>
        {canUpdate && isUnconfirmed && (
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
  if (purchaseReceiptData) {
    const isConfirmed = !!purchaseReceiptData.confirmDate;
    steps = [
      {
        title: '準備中',
        status: isConfirmed ? 'finish' : 'process',
        date: purchaseReceiptData.createdAt,
        user: purchaseReceiptData.createdBy,
      },
      {
        title: '過帳確認',
        status: isConfirmed ? 'finish' : 'wait',
        date: purchaseReceiptData.confirmDate,
        user: purchaseReceiptData.confirmUserName,
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
          moduleName={isMold ? '模具進貨單' : '原料進貨單'}
          isCreate={isCreating}
          isEdit={isEditing}
          record={purchaseReceiptData}
          displayField={(r: PurchaseReceiptDto) => r?.documentNumber ? `${r.documentNumber}` : ''}
          statusTag={(!isCreating && purchaseReceiptData) ? getStatusTag(purchaseReceiptData.status, purchaseReceiptData.confirmDate, purchaseReceiptData.closeDate) : undefined}
        />
      }
      open={true}
      onClose={() => navigate(basePath)}
      size={DRAWER_WIDTH_MAIN as any}
      extra={getHeaderActions()}
      mask={{ closable: isViewMode }}
      keyboard={isViewMode}
    >
      <Spin spinning={isLoading}>
        <ActionBar 
          createdBy={purchaseReceiptData?.createdBy || undefined}
          createdAt={purchaseReceiptData?.createdAt || undefined}
          updatedBy={purchaseReceiptData?.updatedBy || undefined}
          updatedAt={purchaseReceiptData?.updatedAt || undefined}
          actions={getActionBarActions()}
        />
        <div className="py-2 px-6">
          {!isCreating && purchaseReceiptData && <DocumentLifecycleBanner steps={steps} />}
          <MasterDetailTabs
            heightOffset={!isCreating && purchaseReceiptData ? 280 : 160}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            isCreateMode={isCreating}
            isEditMode={isEditing}
            viewId={id}
            disableTabSwitching={isDetailEditing}
            masterContent={
              <div style={{ display: activeTab === 'master_info' ? 'block' : 'none' }}>
                <DynamicForm
                  formId="purchaseReceiptForm"
                  fields={mainFormConfig()}
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
                label: '進貨明細項目',
                children: !isCreating && purchaseReceiptData ? (
                  <PurchaseReceiptItemsTab 
                    purchaseReceiptData={purchaseReceiptData} 
                    isMasterViewMode={isViewMode} 
                    onEditingChange={setIsDetailEditing}
                  />
                ) : (
                  <Empty description="請先儲存進貨單主檔" />
                )
              }
            ]}
          />
        </div>
      </Spin>
    </Drawer>
  );
}
