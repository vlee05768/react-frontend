import { useState } from 'react';
import { Button, Space, Popconfirm, App } from 'antd';
import Table from '@/components/Table/ErpTable';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DynamicForm } from '@/components/Form/DynamicForm';
import { itemFormConfig, itemTableColumns } from './CustomerMaterialReceiptConfig';
import { buildTableColumns } from '@/utils/tableUtils';
import type { CustomerMaterialReceiptDto, CustomerMaterialReceiptItemDto, CreateCustomerMaterialReceiptItemDto, UpdateCustomerMaterialReceiptItemDto } from '@/api/generated/types.gen';
import { postApiV1CustomerMaterialReceiptByCodeItems, putApiV1CustomerMaterialReceiptByCodeItemsByLineNumber, deleteApiV1CustomerMaterialReceiptByCodeItemsByLineNumber } from '@/api/generated';
import CustomerMaterialPickerModal from './CustomerMaterialPickerModal';
import { logger } from '@/utils/logger';
import { getApiMutationErrorMessage } from '@/utils/apiErrorDisplay';

interface CustomerMaterialReceiptItemsTabProps {
  receiptData: CustomerMaterialReceiptDto;
  isMasterViewMode: boolean;
  onEditingChange?: (isEditing: boolean) => void;
}

type CustomerMaterialReceiptItemValues = Partial<CustomerMaterialReceiptItemDto> & {
  isRoll?: boolean;
  materialForm?: string | null;
};

export const isCustomerMaterialReceiptItemEditable = (receipt: Pick<CustomerMaterialReceiptDto, 'status' | 'confirmDate' | 'closeDate'>) => {
  const status = (receipt.status || '').toUpperCase();
  return !receipt.closeDate && !receipt.confirmDate && (status === 'DRAFT' || status === 'UNCONFIRMED' || status === '');
};

export const calculateCustomerMaterialReceiptAreaSqm = (values: CustomerMaterialReceiptItemValues) => {
  const isSheet = values.materialForm === 'S' || values.isRoll === false;
  const widthM = Number(values.width || 0) / 1000;
  if (isSheet) {
    const lengthM = Number(values.length || 0) / 1000;
    return Number(values.physicalQuantity || 0) * widthM * lengthM;
  }
  return Number(values.rollCount || 0) * Number(values.length || 0) * widthM;
};

export const buildUpdateCustomerMaterialReceiptItemDto = (
  values: CustomerMaterialReceiptItemValues,
): UpdateCustomerMaterialReceiptItemDto => ({
  physicalQuantity: values.physicalQuantity ?? null,
  rollCount: values.rollCount ?? null,
  width: values.width ?? null,
  length: values.length ?? null,
  quantity: values.quantity ?? calculateCustomerMaterialReceiptAreaSqm(values),
  packageSeq: values.packageSeq ?? null,
  materialForm: values.materialForm ?? (values.isRoll ? 'R' : 'S'),
  targetStorageCode: values.targetStorageCode ?? null,
  notes: values.notes ?? null,
});

export default function CustomerMaterialReceiptItemsTab({
  receiptData,
  isMasterViewMode,
  onEditingChange,
}: CustomerMaterialReceiptItemsTabProps) {
  const { modal, message } = App.useApp();
  const queryClient = useQueryClient();
  const [editingItem, setEditingItem] = useState<CustomerMaterialReceiptItemDto | null>(null);
  const [isCreatingItem, setIsCreatingItem] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const documentNumber = receiptData.documentNumber!;
  const isEditable = isMasterViewMode && isCustomerMaterialReceiptItemEditable(receiptData);

  // Direct array from parent payload - standard reuse optimization
  const items: CustomerMaterialReceiptItemDto[] = Array.isArray(receiptData.items) ? receiptData.items : [];

  const updateEditState = (editing: boolean) => {
    onEditingChange?.(editing);
  };

  const handleStartCreate = () => {
    setIsPickerOpen(true);
  };

  const handleStartEdit = (record: CustomerMaterialReceiptItemDto) => {
    setEditingItem(record);
    updateEditState(true);
  };

  const handleCancel = () => {
    setIsCreatingItem(false);
    setEditingItem(null);
    updateEditState(false);
  };

  // Mutations
  const createMutation = useMutation({
    mutationFn: (body: CreateCustomerMaterialReceiptItemDto) =>
      postApiV1CustomerMaterialReceiptByCodeItems({
        path: { code: documentNumber },
        body,
      }),
    onSuccess: () => {
      message.success('新增入庫明細成功');
      queryClient.invalidateQueries({ queryKey: ['customer-material-receipt', documentNumber] });
      queryClient.invalidateQueries({ queryKey: ['customer-material-receipts'] });
      handleCancel();
    },
    onError: (err: any) => message.error(getApiMutationErrorMessage(err, '新增失敗')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ lineNumber, body }: { lineNumber: string; body: UpdateCustomerMaterialReceiptItemDto }) =>
      putApiV1CustomerMaterialReceiptByCodeItemsByLineNumber({
        path: { code: documentNumber, lineNumber },
        body,
      }),
    onSuccess: () => {
      message.success('更新入庫明細成功');
      queryClient.invalidateQueries({ queryKey: ['customer-material-receipt', documentNumber] });
      queryClient.invalidateQueries({ queryKey: ['customer-material-receipts'] });
      handleCancel();
    },
    onError: (err: any) => message.error(getApiMutationErrorMessage(err, '更新失敗')),
  });

  const deleteMutation = useMutation({
    mutationFn: (lineNumber: string) =>
      deleteApiV1CustomerMaterialReceiptByCodeItemsByLineNumber({
        path: { code: documentNumber, lineNumber },
      }),
    onSuccess: () => {
      message.success('刪除入庫明細成功');
      queryClient.invalidateQueries({ queryKey: ['customer-material-receipt', documentNumber] });
      queryClient.invalidateQueries({ queryKey: ['customer-material-receipts'] });
    },
    onError: (err: any) => message.error(getApiMutationErrorMessage(err, '刪除失敗')),
  });

  const handlePickerConfirm = async (selected: any[]) => {
    setIsPickerOpen(false);
    let successCount = 0;
    
    try {
      for (const mat of selected) {
        const isRoll = mat.materialForm === 'R';
        const body: CreateCustomerMaterialReceiptItemDto = {
          materialCode: mat.code,
          targetStorageCode: 'TW-QC-GEN', // 預設進貨品質待檢驗倉
          isRoll,
          rollCount: 1,
          width: 1000,
          length: isRoll ? 200 : 1000,
          physicalQuantity: isRoll ? 200 : 1,
          notes: receiptData?.subType === 'SEMI' ? '製令半成品入庫' : '由原料清單挑選帶入',
        };
        
        await createMutation.mutateAsync(body);
        successCount++;
      }
      
      if (successCount > 0) {
        message.success(`成功帶入 ${successCount} 筆入庫明細項目！`);
      }
    } catch (err) {
      logger.error('customer-material.batch-import.failed');
    }
  };

  const handleSubmit = (values: any) => {
    // 1. 同物料代碼防重驗證 (Client-side integrity check)
    const isDuplicate = items.some(
      (item) =>
        item.materialCode === values.materialCode &&
        item.lineNumber !== editingItem?.lineNumber
    );

    if (isDuplicate) {
      modal.error({
        title: '輸入錯誤',
        content: `物料代碼 [${values.materialCode}] 已經存在於本入庫單明細中，請勿重複新增相同物料。`,
        centered: true,
      });
      return;
    }

    // 2. 依規格預覽總面積；卷料以 M 計，片料以 mm × mm 計。
    const materialForm = values.materialForm || (values.isRoll ? 'R' : 'S');
    const finalValues = {
      ...values,
      materialForm,
      quantity: calculateCustomerMaterialReceiptAreaSqm({ ...values, materialForm }),
    };

    if (isCreatingItem) {
      createMutation.mutate(finalValues as any);
    } else if (editingItem) {
      updateMutation.mutate({
        lineNumber: editingItem.lineNumber!,
        body: buildUpdateCustomerMaterialReceiptItemDto(finalValues),
      });
    }
  };

  const actionColumn = {
    title: '操作',
    key: 'actions',
    fixed: 'right' as const,
    width: 120,
    render: (_: any, record: CustomerMaterialReceiptItemDto) => {
      if (!isEditable) return null;
      return (
        <Space size="small">
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleStartEdit(record)}
          />
          <Popconfirm
            title="確認要刪除此筆入庫明細項目嗎？"
            onConfirm={() => deleteMutation.mutate(record.lineNumber!)}
            okText="確認"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
            />
          </Popconfirm>
        </Space>
      );
    },
  };

  const columns = buildTableColumns(itemTableColumns(), actionColumn, undefined);

  // 渲染建立或編輯明細的 DynamicForm 視圖 (Inline view pattern)
  if (isCreatingItem || editingItem) {
    const defaultVals = editingItem ? {
      ...editingItem,
      isRoll: editingItem.isRoll ?? editingItem.materialForm === 'R',
      materialForm: editingItem.materialForm || (editingItem.isRoll ? 'R' : 'S'),
    } : {
      isRoll: true,
      materialForm: 'R',
      rollCount: 1,
      width: 1000,
      length: 200,
      physicalQuantity: 200,
      targetStorageCode: 'TW-QC-GEN', // 預設進貨品質待檢驗倉，現場防呆
    };

    return (
      <div 
        className="p-6 border border-solid border-[var(--ant-color-border-secondary)] rounded-2xl bg-slate-50/60 dark:bg-zinc-900/10 shadow-sm"
        style={{ marginTop: '16px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h3 style={{ margin: 0, fontWeight: 600 }}>
            {isCreatingItem ? '新增入庫明細項目' : `編輯入庫明細項目 (項次: ${editingItem?.lineNumber})`}
          </h3>
          <Space>
            <Button
              type="primary"
              onClick={() => (document.getElementById('customer-item-form') as HTMLFormElement)?.requestSubmit()}
              loading={createMutation.isPending || updateMutation.isPending}
            >
              儲存明細
            </Button>
            <Button onClick={handleCancel}>
              返回清單
            </Button>
          </Space>
        </div>
        <DynamicForm
          formId="customer-item-form"
          fields={itemFormConfig(false)}
          defaultValues={defaultVals}
          onSubmit={handleSubmit}
          hideDefaultFooter
          isViewMode={false}
          isUpdateMode={!!editingItem}
        />
      </div>
    );
  }

  // 正常清單視圖
  return (
    <div style={{ marginTop: '16px' }}>
      <CustomerMaterialPickerModal
        open={isPickerOpen}
        onCancel={() => setIsPickerOpen(false)}
        onConfirm={handlePickerConfirm}
        customerCode={receiptData.partnerRoleCode || receiptData.businessPartnerCode || ''}
        customerName={receiptData.businessPartnerName || ''}
        excludeMaterialCodes={items.map((item) => item.materialCode!)}
      />

      {/* 灰盒操作工具列 (Grey Box Operation Bar) */}
      <div 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '16px',
          padding: '10px 16px',
          backgroundColor: 'var(--ant-color-fill-alter)',
          borderRadius: '8px',
          border: '1px solid var(--ant-color-border-secondary)'
        }}
      >
        <div style={{ color: 'var(--ant-color-text-secondary)', fontSize: '14px' }}>
          明細共計 <span style={{ fontWeight: 600, color: 'var(--ant-color-primary)' }}>{items.length}</span> 項
        </div>
        <div>
          {isEditable && (
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={handleStartCreate}
            >
              新增明細項目
            </Button>
          )}
        </div>
      </div>

      <Table
        dataSource={items}
        columns={columns}
        rowKey="lineNumber"
        pagination={false}
        scroll={{ x: 1000 }}
        bordered
        size="medium"
      />
    </div>
  );
}
