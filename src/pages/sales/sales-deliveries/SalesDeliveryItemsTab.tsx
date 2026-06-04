import { useState, useMemo } from 'react';
import { Table, Button, App, Space, Typography, Modal, InputNumber, Input, Form, Spin, Descriptions, Select } from 'antd';
import type { SalesDeliveryItemDto, CreateSalesDeliveryItemDto } from '@/api/generated/types.gen';
import { 
  deleteApiV1SalesDeliveryByMovementNumberItemsByLineNumber,
  postApiV1SalesDeliveryByMovementNumberItems,
  putApiV1SalesDeliveryByMovementNumberItemsByLineNumber,
  getApiV1StorageInventory
} from '@/api/generated/sdk.gen';
import { useMutation } from '@tanstack/react-query';
import { getApiErrorMessage } from '@/utils/apiError';
import UndeliveredOrderItemPicker from './components/UndeliveredOrderItemPicker';
import { DynamicForm } from '@/components/Form/DynamicForm';
import { getItemColumns, getItemFormConfig } from './SalesDeliveryConfig';

const { Text } = Typography;

interface Props {
  documentNumber: string;
  customerCode: string;
  items: SalesDeliveryItemDto[];
  isEditing: boolean;
  isConfirmed: boolean;
  onRefresh: () => void;
  onEditingChange?: (isEditing: boolean) => void;
}

export default function SalesDeliveryItemsTab({ documentNumber, customerCode, items, isEditing, isConfirmed, onRefresh, onEditingChange }: Props) {
  const { modal, message } = App.useApp();
  const InputNumberComponent: any = InputNumber;
  const [showPicker, setShowPicker] = useState(false);
  const [editingItem, setEditingItem] = useState<SalesDeliveryItemDto | null>(null);

  // 新增備品 Modal 相關狀態
  const [addSpareItem, setAddSpareItem] = useState<SalesDeliveryItemDto | null>(null);
  const [isEditingSpare, setIsEditingSpare] = useState(false);
  const [scrapStock, setScrapStock] = useState<number | null>(null);
  const [loadingStock, setLoadingStock] = useState(false);
  const [spareForm] = Form.useForm();

  // 模具費用 Modal 相關狀態
  const [showMoldFeeModal, setShowMoldFeeModal] = useState(false);
  const [isEditingMoldFee, setIsEditingMoldFee] = useState(false);
  const [moldFeeItem, setMoldFeeItem] = useState<SalesDeliveryItemDto | null>(null);
  const [moldFeeForm] = Form.useForm();

  const handleAddSpareOpen = async (record: SalesDeliveryItemDto) => {
    setIsEditingSpare(false);
    setAddSpareItem(record);
    setScrapStock(null);
    setLoadingStock(true);
    spareForm.setFieldsValue({
      quantity: undefined,
      notes: undefined,
    });

    try {
      const res = await getApiV1StorageInventory({
        query: {
          StorageCode: 'TW-SCRAP-GEN',
          InventoryCode: record.inventoryCode || '',
        }
      });
      const stock = res.data?.data?.[0]?.quantity ?? 0;
      setScrapStock(stock);
    } catch (e: any) {
      console.error(e);
      message.error('取得報廢倉庫存失敗：' + getApiErrorMessage(e));
      setScrapStock(0);
    } finally {
      setLoadingStock(false);
    }
  };

  const handleAddSpareConfirm = async () => {
    try {
      const values = await spareForm.validateFields();
      if (!addSpareItem) return;

      if (isEditingSpare) {
        // 編輯模式：更新備品
        const updatePayload = {
          inventoryType: addSpareItem.inventoryType,
          inventoryCode: addSpareItem.inventoryCode,
          inventoryName: addSpareItem.inventoryName,
          transactionType: 'SP',
          subType: 'SP',
          partnerProductId: addSpareItem.partnerProductId,
          referenceNumber: addSpareItem.referenceNumber,
          partnerDocumentNumber: addSpareItem.partnerDocumentNumber,
          unitPrice: 0,
          quantity: values.quantity,
          sourceStorageCode: 'TW-SCRAP-GEN',
          notes: values.notes,
          unit: addSpareItem.unit,
        };
        await updateMutation.mutateAsync({
          lineNumber: addSpareItem.lineNumber!,
          values: updatePayload,
        });
        setAddSpareItem(null);
        setIsEditingSpare(false);
      } else {
        // 新增模式：建立備品
        const newSpareDto: CreateSalesDeliveryItemDto = {
          inventoryType: 'P',
          inventoryCode: addSpareItem.inventoryCode || '',
          inventoryName: addSpareItem.inventoryName || '',
          transactionType: 'SP',
          subType: 'SP',
          partnerProductId: addSpareItem.partnerProductId,
          referenceNumber: addSpareItem.referenceNumber,
          partnerDocumentNumber: addSpareItem.partnerDocumentNumber,
          unitPrice: 0,
          quantity: values.quantity,
          sourceStorageCode: 'TW-SCRAP-GEN',
          notes: values.notes,
          unit: addSpareItem.unit,
        };

        await addItemsMutation.mutateAsync([newSpareDto]);
        setAddSpareItem(null);
      }
    } catch (e) {
      // Handled or validated
    }
  };

  const originalOrderItems = useMemo(() => {
    const keys = new Set<string>();
    items.forEach((i: any) => {
      if (i.referenceNumber) {
        keys.add(i.referenceNumber);
      }
      if (i.extraData) {
        try {
          const allocations = Array.isArray(i.extraData) 
            ? i.extraData 
            : (typeof i.extraData === 'object' && i.extraData !== null)
              ? (i.extraData as any).rootElement 
                ? JSON.parse(JSON.stringify(i.extraData)) 
                : i.extraData
              : JSON.parse(typeof i.extraData === 'string' ? i.extraData : '{}');
          
          const list = Array.isArray(allocations) ? allocations : (allocations?.data || []);
          if (Array.isArray(list)) {
            list.forEach((alloc: any) => {
              const lineNum = alloc.OrderItemLineNumber || alloc.orderItemLineNumber || alloc.lineNumber || alloc.LineNumber;
              if (lineNum) {
                keys.add(lineNum);
              }
            });
          }
        } catch (e) {
          // ignore
        }
      }
    });
    return Array.from(keys);
  }, [items]);

  const productOptions = useMemo(() => {
    const seen = new Set<string>();
    const options: { label: string; value: string }[] = [];
    items.forEach(item => {
      if (item.inventoryType === 'P' && item.inventoryCode) {
        if (!seen.has(item.inventoryCode)) {
          seen.add(item.inventoryCode);
          options.push({
            label: `${item.inventoryName || ''} (${item.inventoryCode})`,
            value: item.inventoryCode
          });
        }
      }
    });
    return options;
  }, [items]);

  const handleMoldFeeConfirm = async () => {
    try {
      const values = await moldFeeForm.validateFields();
      if (isEditingMoldFee) {
        if (!moldFeeItem) return;
        const updatePayload = {
          inventoryType: 'O',
          inventoryCode: 'MOLD-FEE',
          inventoryName: '模具費用',
          transactionType: 'INV',
          subType: 'OF',
          partnerProductId: moldFeeItem.partnerProductId,
          unitPrice: values.amount,
          quantity: 1,
          sourceStorageCode: undefined,
          notes: values.notes || undefined,
          unit: moldFeeItem.unit || '次',
        };
        await updateMutation.mutateAsync({
          lineNumber: moldFeeItem.lineNumber!,
          values: updatePayload,
        });
        setMoldFeeItem(null);
        setIsEditingMoldFee(false);
      } else {
        const newMoldFeeDto: CreateSalesDeliveryItemDto = {
          inventoryType: 'O',
          inventoryCode: 'MOLD-FEE',
          inventoryName: '模具費用',
          transactionType: 'INV',
          subType: 'OF',
          partnerProductId: values.associatedProduct,
          unitPrice: values.amount,
          quantity: 1,
          sourceStorageCode: undefined,
          notes: values.notes || undefined,
          unit: '式',
        };
        await addItemsMutation.mutateAsync([newMoldFeeDto]);
        setShowMoldFeeModal(false);
      }
    } catch (e) {
      // Form validation or API error
    }
  };

  const canModifyItems = !isEditing && !isConfirmed;
  const isViewMode = !canModifyItems;
  const isEditingState = !!editingItem;
  const hasProduct = useMemo(() => {
    return items.some(item => item.inventoryType === 'P');
  }, [items]);

  const notifyEdit = (editing: boolean) => {
    if (onEditingChange) onEditingChange(editing);
  };

  const handleEditOpen = async (record: SalesDeliveryItemDto) => {
    const isSpare = record.subType === 'SP' || record.transactionType === 'SP';
    const isMoldFee = record.inventoryCode === 'MOLD-FEE';
    if (isSpare) {
      setIsEditingSpare(true);
      setAddSpareItem(record);
      setScrapStock(null);
      setLoadingStock(true);
      spareForm.setFieldsValue({
        quantity: record.quantity,
        notes: record.notes || undefined,
      });

      try {
        const res = await getApiV1StorageInventory({
          query: {
            StorageCode: 'TW-GEN-SCRAP',
            InventoryCode: record.inventoryCode || '',
          }
        });
        const stock = res.data?.data?.[0]?.quantity ?? 0;
        setScrapStock(stock + (record.quantity || 0));
      } catch (e: any) {
        console.error(e);
        message.error('取得報廢倉庫存失敗：' + getApiErrorMessage(e));
        setScrapStock(record.quantity || 0);
      } finally {
        setLoadingStock(false);
      }
    } else if (isMoldFee) {
      setIsEditingMoldFee(true);
      setMoldFeeItem(record);
      moldFeeForm.setFieldsValue({
        associatedProduct: record.partnerProductId || undefined,
        amount: record.unitPrice || 0,
        notes: record.notes || undefined,
      });
      setShowMoldFeeModal(true);
    } else {
      setEditingItem(record);
      notifyEdit(true);
    }
  };

  const handleCancel = () => {
    setEditingItem(null);
    notifyEdit(false);
  };

  const deleteMutation = useMutation({
    mutationFn: (lineNumber: string) => deleteApiV1SalesDeliveryByMovementNumberItemsByLineNumber({ path: { movementNumber: documentNumber, lineNumber } }),
    onSuccess: () => {
      message.success('刪除明細成功');
      onRefresh();
    },
    onError: (error) => {
      modal.error({ centered: true, title: '刪除失敗', content: getApiErrorMessage(error) });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ lineNumber, values }: { lineNumber: string, values: any }) => 
      putApiV1SalesDeliveryByMovementNumberItemsByLineNumber({ path: { movementNumber: documentNumber, lineNumber }, body: values }),
    onSuccess: () => {
      message.success('更新明細成功');
      onRefresh();
      handleCancel();
    },
    onError: (error) => {
      modal.error({ centered: true, title: '錯誤提示', content: `更新明細失敗: ${getApiErrorMessage(error)}` });
    }
  });

  const addItemsMutation = useMutation({
    mutationFn: async (newItems: CreateSalesDeliveryItemDto[]) => {
      for (const item of newItems) {
        await postApiV1SalesDeliveryByMovementNumberItems({
          path: { movementNumber: documentNumber },
          body: item
        });
      }
    },
    onSuccess: () => {
      message.success('明細新增成功');
      setShowPicker(false);
      onRefresh();
    },
    onError: (error) => {
      modal.error({ centered: true, title: '新增失敗', content: getApiErrorMessage(error) });
    }
  });

  const handleDelete = (record: SalesDeliveryItemDto) => {
    modal.confirm({
      title: '確認刪除',
      content: `確定要刪除明細 ${record.lineNumber} 嗎？`,
      centered: true,
      width: 400,
      okButtonProps: { danger: true },
      onOk: () => deleteMutation.mutate(record.lineNumber!)
    });
  };

  const handlePickerConfirm = (selectedItems: CreateSalesDeliveryItemDto[]) => {
    addItemsMutation.mutate(selectedItems);
  };

  const handleSubmit = async (values: any) => {
    try {
      if (editingItem) {
        await updateMutation.mutateAsync({ lineNumber: editingItem.lineNumber!, values });
      }
    } catch (e) {
      // handled in onError
    }
  };

  return (
    <div>
      {isEditingState ? (
        <div className="p-4" style={{border: '1px solid var(--ant-color-border-secondary)', borderRadius: '8px', backgroundColor: 'var(--ant-color-bg-container)'}}>
          <div className="flex justify-between mb-4">
            <Text strong style={{ fontSize: '16px' }}>{`編輯明細 (${editingItem?.lineNumber})`}</Text>
            <Space>
              <Button type="primary" htmlType="submit" form="itemForm" loading={updateMutation.isPending}>儲存</Button>
              <Button onClick={handleCancel}>取消</Button>
            </Space>
          </div>
          <DynamicForm
            formId="itemForm"
            fields={getItemFormConfig()}
            defaultValues={editingItem || undefined}
            isViewMode={false}
            isUpdateMode={true}
            hideDefaultFooter={true}
            onSubmit={handleSubmit}
          />
        </div>
      ) : (
        <div>
          <div className="flex justify-between items-center mb-4 py-2 px-3" style={{backgroundColor: 'var(--ant-color-fill-alter)', borderRadius: '6px'}}>
            <div style={{ color: 'var(--ant-color-text-secondary)' }}>
              目前共有 <span>{items.length}</span> 筆明細
            </div>
            <div>
              {canModifyItems && (
                <Space>
                  <Button 
                    type="default" 
                    disabled={!hasProduct} 
                    onClick={() => {
                      setIsEditingMoldFee(false);
                      setMoldFeeItem(null);
                      moldFeeForm.resetFields();
                      setShowMoldFeeModal(true);
                    }}
                  >
                    新增模具費用
                  </Button>
                  <Button type="primary" disabled={!customerCode} onClick={() => setShowPicker(true)}>
                    挑選未出貨訂單
                  </Button>
                </Space>
              )}
            </div>
          </div>
          <Table
            virtual
            columns={getItemColumns(isViewMode, handleEditOpen, handleDelete, handleAddSpareOpen, items)}
            dataSource={items}
            rowKey="lineNumber"
            pagination={false}
            scroll={{ x: 1500, y: 400 }}
            size="small"
            bordered
          />
        </div>
      )}
      <UndeliveredOrderItemPicker
        open={showPicker}
        customerCode={customerCode}
        originalOrderItems={originalOrderItems}
        onClose={() => setShowPicker(false)}
        onConfirm={handlePickerConfirm}
      />

      <Modal
        title={isEditingSpare ? "修改產品備品" : "新增產品備品"}
        open={!!addSpareItem}
        onOk={handleAddSpareConfirm}
        onCancel={() => {
          setAddSpareItem(null);
          setIsEditingSpare(false);
        }}
        confirmLoading={addItemsMutation.isPending || updateMutation.isPending}
        okButtonProps={{ disabled: loadingStock || scrapStock === null || scrapStock <= 0 }}
        centered
        destroyOnClose
      >
        <Spin spinning={loadingStock} tip="正在查詢報廢倉庫存...">
          {addSpareItem && (
            <div className="py-4">
              <Descriptions column={1} size="small" bordered className="mb-4">
                <Descriptions.Item label="品名">{addSpareItem.inventoryName}</Descriptions.Item>
                <Descriptions.Item label="料號">{addSpareItem.inventoryCode}</Descriptions.Item>
                <Descriptions.Item label="來源儲位">報廢倉 (TW-GEN-SCRAP)</Descriptions.Item>
                <Descriptions.Item label="報廢倉現有庫存">
                  <span className={scrapStock && scrapStock > 0 ? "text-green-600 font-bold" : "text-red-500 font-bold"}>
                    {scrapStock !== null ? `${scrapStock.toLocaleString()} ${addSpareItem.unit || ''}` : '-'}
                  </span>
                </Descriptions.Item>
              </Descriptions>

              {scrapStock !== null && scrapStock <= 0 ? (
                <div className="text-red-500 font-medium text-center py-2 px-3" style={{ backgroundColor: 'var(--ant-color-error-bg-hover)', borderRadius: '4px' }}>
                  ⚠️ 目前該產品在報廢倉 (TW-GEN-SCRAP) 中無庫存，無法新增備品。
                </div>
              ) : (
                <Form form={spareForm} layout="vertical">
                  <Form.Item
                    name="quantity"
                    label="備品出貨數量"
                    rules={[
                      { required: true, message: '請輸入備品數量' },
                      { type: 'number', min: 1, max: scrapStock || undefined, message: `數量必須介於 1 到 ${scrapStock?.toLocaleString() || ''} 之間` }
                    ]}
                  >
                    <InputNumberComponent
                      style={{ width: '100%' }}
                      placeholder="請輸入出貨數量"
                      precision={0}
                      controls={false}
                      allowClear
                      autoFocus
                    />
                  </Form.Item>
                  <Form.Item
                    name="notes"
                    label="備註"
                  >
                    <Input placeholder="可輸入備註" />
                  </Form.Item>
                </Form>
              )}
            </div>
          )}
        </Spin>
      </Modal>

      <Modal
        title={isEditingMoldFee ? "修改模具費用" : "新增模具費用"}
        open={showMoldFeeModal}
        onOk={handleMoldFeeConfirm}
        onCancel={() => {
          setShowMoldFeeModal(false);
          setMoldFeeItem(null);
          setIsEditingMoldFee(false);
        }}
        confirmLoading={addItemsMutation.isPending || updateMutation.isPending}
        centered
        destroyOnClose
      >
        <Form form={moldFeeForm} layout="vertical" className="pt-4">
          <Form.Item
            name="associatedProduct"
            label="關聯產品"
            rules={[{ required: true, message: '請選擇關聯產品' }]}
          >
            <Select
              disabled={isEditingMoldFee}
              placeholder="請選擇產品"
              options={productOptions}
            />
          </Form.Item>
          <Form.Item
            name="amount"
            label="模具費用金額"
            rules={[
              { required: true, message: '請輸入金額' },
              { type: 'number', min: 1, message: '金額必須大於 0' }
            ]}
          >
            <InputNumberComponent
              style={{ width: '100%' }}
              placeholder="請輸入金額"
              precision={0}
              controls={false}
              allowClear
              autoFocus={!isEditingMoldFee}
            />
          </Form.Item>
          <Form.Item
            name="notes"
            label="備註"
          >
            <Input placeholder="可輸入備註" autoFocus={isEditingMoldFee} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
