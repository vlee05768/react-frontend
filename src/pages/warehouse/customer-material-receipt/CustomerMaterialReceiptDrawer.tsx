import { useState, useEffect, useMemo } from 'react';
import { Drawer, Space, Button, App, Spin, Empty } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircleOutlined, DeleteOutlined, CloseCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

import { DynamicForm } from '@/components/Form/DynamicForm';
import { ActionButton } from '@/components/common/ActionButton';
import { ActionBar } from '@/components/common/ActionBar';
import { DocumentLifecycleBanner } from '@/components/common/DocumentLifecycleBanner';
import { MasterDetailTabs } from '@/components/Form/MasterDetailTabs';
import { DrawerTitle } from '@/components/Form/DrawerTitle';

import { masterFormConfig, getStatusTag } from './CustomerMaterialReceiptConfig';
import CustomerMaterialReceiptItemsTab from './CustomerMaterialReceiptItemsTab';

import { getApiV1CustomerMaterialReceiptByCode, postApiV1CustomerMaterialReceipt, putApiV1CustomerMaterialReceiptByCode, postApiV1CustomerMaterialReceiptByCodeConfirm, postApiV1CustomerMaterialReceiptByCodeCancelConfirm, deleteApiV1CustomerMaterialReceiptByCode } from '@/api/generated';

export default function CustomerMaterialReceiptDrawer() {
  const { documentNumber: routeId } = useParams<{ documentNumber: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { modal, message } = App.useApp();

  const isCreating = routeId === 'create' || !routeId;
  const documentNumber = isCreating ? '' : routeId;

  const [isEditing, setIsEditing] = useState(isCreating);
  const [activeTab, setActiveTab] = useState('master_info');
  const [isDetailEditing, setIsDetailEditing] = useState(false);

  // Fetch Master Data
  const { data: response, isLoading } = useQuery({
    queryKey: ['customer-material-receipt', documentNumber],
    queryFn: () => getApiV1CustomerMaterialReceiptByCode({ path: { code: documentNumber! } }),
    enabled: !isCreating && !!documentNumber,
  });

  const receiptData = (response?.data as any)?.data || response?.data;

  const defaultFormValues = useMemo(() => {
    if (isCreating) {
      return {
        documentNumber: '【系統自動編碼】',
        documentDate: dayjs(), // Dayjs object!
        status: 'Unconfirmed',
      };
    }
    if (receiptData) {
      return {
        ...receiptData,
        businessPartnerCode: receiptData.partnerRoleCode || receiptData.businessPartnerCode, // 📌 顯示客戶角色編號（如 C0001），對齊採購進貨單模式
        documentDate: receiptData.documentDate ? dayjs(receiptData.documentDate) : undefined, // Dayjs object!
      };
    }
    return undefined;
  }, [isCreating, receiptData]);

  // Sync automatic edit and tab transition on redirect
  useEffect(() => {
    if (isCreating) {
      setIsEditing(true);
      setActiveTab('master_info');
    } else {
      setIsEditing(false);
    }
  }, [routeId, isCreating]);

  // 如果非新增模式，且資料載入完畢後發現沒有任何明細項目，自動切換至明細分頁以利快速新增
  useEffect(() => {
    if (!isCreating && receiptData) {
      const items = receiptData.items || [];
      if (items.length === 0) {
        setActiveTab('items_tab');
      }
    }
  }, [isCreating, receiptData]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: (body: any) => postApiV1CustomerMaterialReceipt({ body }),
    onSuccess: (res: any) => {
      const newRecord = res.data?.data || res.data;
      const newId = newRecord?.documentNumber;
      message.success('建立客供料入庫單成功');
      queryClient.invalidateQueries({ queryKey: ['customer-material-receipts'] });
      
      if (newId) {
        setTimeout(() => {
          setActiveTab('items_tab');
        }, 100);
        navigate(`/warehouse/customer-material-receipt/${newId}`, { replace: true });
        setIsEditing(false);
      }
    },
    onError: (err: any) => message.error(err.response?.data?.message || '建立失敗'),
  });

  const updateMutation = useMutation({
    mutationFn: (body: any) =>
      putApiV1CustomerMaterialReceiptByCode({
        path: { code: documentNumber! },
        body,
      }),
    onSuccess: () => {
      message.success('更新客供料主檔成功');
      queryClient.invalidateQueries({ queryKey: ['customer-material-receipt', documentNumber] });
      queryClient.invalidateQueries({ queryKey: ['customer-material-receipts'] });
      setIsEditing(false);
    },
    onError: (err: any) => message.error(err.response?.data?.message || '更新失敗'),
  });

  const confirmMutation = useMutation({
    mutationFn: () => postApiV1CustomerMaterialReceiptByCodeConfirm({ path: { code: documentNumber! } }),
    onSuccess: () => {
      message.success('客供料入庫單確認過帳成功，物理 LPN 卷卡已建立！');
      queryClient.invalidateQueries({ queryKey: ['customer-material-receipt', documentNumber] });
      queryClient.invalidateQueries({ queryKey: ['customer-material-receipts'] });
    },
    onError: (err: any) => {
      modal.error({
        title: '過帳失敗',
        content: err.response?.data?.message || '確認過帳發生錯誤，請檢查原料代號與儲位設定。',
        centered: true,
      });
    },
  });

  const cancelConfirmMutation = useMutation({
    mutationFn: () => postApiV1CustomerMaterialReceiptByCodeCancelConfirm({ path: { code: documentNumber! } }),
    onSuccess: () => {
      message.success('取消確認成功，已清理生成之 LPN 卡與庫存。');
      queryClient.invalidateQueries({ queryKey: ['customer-material-receipt', documentNumber] });
      queryClient.invalidateQueries({ queryKey: ['customer-material-receipts'] });
    },
    onError: (err: any) => {
      modal.error({
        title: '無法取消確認',
        content: err.response?.data?.message || '取消確認失敗。這通常是因為該批客供料已在車間生產中被領用消耗，為了維護「帳實一致」系統禁止回滾。',
        centered: true,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteApiV1CustomerMaterialReceiptByCode({ path: { code: documentNumber! } }),
    onSuccess: () => {
      message.success('刪除客供料入庫單成功');
      queryClient.invalidateQueries({ queryKey: ['customer-material-receipts'] });
      navigate('/warehouse/customer-material-receipt');
    },
    onError: (err: any) => message.error(err.response?.data?.message || '刪除失敗'),
  });

  // Handle Master Save Submit
  const handleMasterSubmit = (values: any) => {
    // Force Financial fields to 0
    const body = {
      ...values,
      subTotal: 0,
      totalAmount: 0,
      taxAmount: 0,
    };
    if (isCreating) {
      createMutation.mutate(body);
    } else {
      updateMutation.mutate(body);
    }
  };

  const handleCancelEdit = () => {
    if (isCreating) {
      navigate('/warehouse/customer-material-receipt');
    } else {
      setIsEditing(false);
    }
  };

  const handleConfirmDoc = () => {
    modal.confirm({
      title: '確認過帳入庫',
      content: '確認過帳後，系統將依據明細的分卷規格自動生成「零成本」原料實物 LPN 條碼卷卡，並實時入庫增加邏輯帳。確定要執行嗎？',
      okText: '確認過帳',
      cancelText: '取消',
      centered: true,
      onOk: () => confirmMutation.mutate(),
    });
  };

  const handleCancelConfirmDoc = () => {
    modal.confirm({
      title: '確認取消過帳',
      content: '取消確認會將此進貨批次在庫的所有 LPN 條碼卷卡徹底作廢刪除，並扣除對應倉庫的可用庫存。確定要執行嗎？',
      okText: '取消過帳',
      cancelText: '取消',
      okButtonProps: { danger: true },
      centered: true,
      onOk: () => cancelConfirmMutation.mutate(),
    });
  };

  // Header Extra Actions (Lifecycle Actions - Drawer Header Rule)
  const getHeaderActions = () => {
    if (isCreating || isEditing) return null; // Hide lifecycles during edits
    if (!receiptData) return null;

    const isDraft = (receiptData.status || '').toUpperCase() === 'UNCONFIRMED' || !receiptData.confirmDate;

    return (
      <Space>
        {isDraft ? (
          <>
            <ActionButton
              key="confirm"
              intent="success"
              icon={<CheckCircleOutlined />}
              disabled={isDetailEditing || itemsCount === 0}
              onClick={handleConfirmDoc}
            >
              確認過帳
            </ActionButton>
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
                  content: `確定要刪除客供料入庫單 ${receiptData.documentNumber} 嗎？`,
                  centered: true,
                  width: 400,
                  okButtonProps: { danger: true },
                  onOk: () => deleteMutation.mutate(),
                });
              }}
            >
              刪除
            </ActionButton>
          </>
        ) : (
          <ActionButton
            key="cancel-confirm"
            intent="warning"
            icon={<CloseCircleOutlined />}
            disabled={isDetailEditing}
            onClick={handleCancelConfirmDoc}
          >
            取消確認
          </ActionButton>
        )}
      </Space>
    );
  };

  // ActionBar CRUD Actions (Form CRUD - ActionBar Rule)
  const getActionBarActions = () => {
    if (isEditing) {
      return (
        <Space>
          <Button
            key="save"
            type="primary"
            onClick={() => (document.getElementById('master-receipt-form') as HTMLFormElement)?.requestSubmit()}
            loading={createMutation.isPending || updateMutation.isPending}
          >
            儲存
          </Button>
          <Button key="cancel" onClick={handleCancelEdit}>
            取消
          </Button>
        </Space>
      );
    }

    const isDraft = !receiptData || (receiptData.status || '').toUpperCase() === 'UNCONFIRMED' || !receiptData.confirmDate;
    if (!isDraft) return null; // Locked after confirm

    return (
      <Button
        key="edit"
        type="primary"
        disabled={isDetailEditing}
        onClick={(e) => {
          e.preventDefault();
          setIsEditing(true);
        }}
      >
        編輯
      </Button>
    );
  };

  const itemsCount = receiptData?.items?.length || 0;

  let steps: any[] = [];
  if (receiptData) {
    const isConfirmed = !!receiptData.confirmDate;
    steps = [
      {
        title: '準備中',
        status: isConfirmed ? 'finish' : 'process',
        date: receiptData.createdAt,
        user: receiptData.createdBy,
      },
      {
        title: '過帳確認',
        status: isConfirmed ? 'finish' : 'wait',
        date: receiptData.confirmDate,
        user: receiptData.confirmUserName,
      }
    ];
  }

  return (
    <Drawer
      title={
        <DrawerTitle
          moduleName="客供料入庫單"
          isCreate={isCreating}
          isEdit={isEditing}
          record={receiptData}
          displayField={(r: any) => r?.documentNumber ? `${r.documentNumber}` : ''}
          statusTag={(!isCreating && receiptData) ? getStatusTag(receiptData.status, receiptData.confirmDate, receiptData.closeDate) : undefined}
        />
      }
      size={1000}
      open={true}
      onClose={() => navigate('/warehouse/customer-material-receipt')}
      destroyOnClose
      extra={getHeaderActions()}
      styles={{ body: { padding: 0, overflow: 'hidden' } }}
      maskClosable={!isEditing && !isDetailEditing}
      keyboard={!isEditing && !isDetailEditing}
    >
      <Spin spinning={!isCreating && isLoading}>
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Banner area */}
          <div style={{ padding: '16px 24px 8px 24px', flexShrink: 0 }}>
            {!isCreating && receiptData && <DocumentLifecycleBanner steps={steps} />}
            <ActionBar 
              createdBy={receiptData?.createdBy || undefined}
              createdAt={receiptData?.createdAt || undefined}
              updatedBy={receiptData?.updatedBy || undefined}
              updatedAt={receiptData?.updatedAt || undefined}
              actions={getActionBarActions()} 
            />
          </div>

          {/* Dynamic tabbed layouts */}
          <div style={{ flex: 1, overflow: 'hidden', padding: '0 24px 24px 24px' }}>
            <MasterDetailTabs
              heightOffset={!isCreating && receiptData ? 280 : 160}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              isCreateMode={isCreating}
              isEditMode={isEditing}
              viewId={documentNumber || 'create'}
              disableTabSwitching={isDetailEditing}
              masterContent={
                <div style={{ display: activeTab === 'master_info' ? 'block' : 'none' }}>
                  <DynamicForm
                    formId="master-receipt-form"
                    fields={masterFormConfig(!isEditing)}
                    defaultValues={defaultFormValues}
                    onSubmit={handleMasterSubmit}
                    hideDefaultFooter
                    isViewMode={!isEditing}
                    isUpdateMode={isEditing && !isCreating}
                  />
                </div>
              }
              detailTabs={[
                {
                  key: 'items_tab',
                  label: `入庫明細 (${itemsCount})`,
                  children: !isCreating && receiptData ? (
                    <CustomerMaterialReceiptItemsTab
                      receiptData={receiptData}
                      isMasterViewMode={!isEditing}
                      onEditingChange={setIsDetailEditing}
                    />
                  ) : (
                    <Empty description="請先儲存客供料入庫單主檔" />
                  ),
                }
              ]}
            />
          </div>
        </div>
      </Spin>
    </Drawer>
  );
}
