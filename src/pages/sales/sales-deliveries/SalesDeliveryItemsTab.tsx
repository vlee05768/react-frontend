import { useState, useMemo, useEffect, useRef } from 'react';
import { Table, Button, App, Space, Typography, Modal, InputNumber, Input, Form, Spin, Descriptions, Select, Tag, Tooltip } from 'antd';
import type { SalesDeliveryItemDto, CreateSalesDeliveryItemDto } from '@/api/generated/types.gen';
import { 
  deleteApiV1SalesDeliveryByMovementNumberItemsByLineNumber,
  postApiV1SalesDeliveryByMovementNumberItems,
  putApiV1SalesDeliveryByMovementNumberItemsByLineNumber,
  getApiV1StorageInventory,
  getApiV1SalesDeliverySelectableRolls,
  getApiV1SalesDeliveryAllocatedRolls
} from '@/api/generated/sdk.gen';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getApiErrorMessage } from '@/utils/apiError';
import UndeliveredOrderItemPicker from './components/UndeliveredOrderItemPicker';
import { DynamicForm } from '@/components/Form/DynamicForm';
import { getItemColumns, getItemFormConfig, getDeliveryItemWidth } from './SalesDeliveryConfig';

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

  // 💡 智慧判定捲料或片料
  const isRoll = useMemo(() => {
    if (!editingItem) return false;
    const code = editingItem.inventoryCode || "";
    const isCodeRoll = code.toUpperCase().endsWith("R") || code.toUpperCase().startsWith("R-");
    const unitUpper = (editingItem.unit || "").toUpperCase();
    const isUnitRoll = unitUpper === "SQM" || unitUpper === "M²" || unitUpper === "M";
    return isCodeRoll || isUnitRoll;
  }, [editingItem]);

  // 💡 智慧取得片材規格 (長寬)
  const sheetSpec = useMemo(() => {
    if (!editingItem) return { width: 0, length: 0 };
    if (isRoll) return { width: 0, length: 0 };
    
    // Read from extraData first
    if (editingItem.extraData) {
      try {
        const allocations = Array.isArray(editingItem.extraData)
          ? editingItem.extraData
          : typeof editingItem.extraData === "object" && editingItem.extraData !== null
            ? (editingItem.extraData as any).rootElement
              ? JSON.parse(JSON.stringify(editingItem.extraData))
              : editingItem.extraData
            : JSON.parse(typeof editingItem.extraData === "string" ? editingItem.extraData : "{}");
            
        const list = Array.isArray(allocations)
          ? allocations
          : (allocations?.data || allocations?.rootElement || allocations || []);
          
        if (Array.isArray(list) && list.length > 0) {
          const w = list[0].WidthMm ?? list[0].widthMm ?? 0;
          const l = list[0].LengthMm ?? list[0].lengthMm ?? list[0].lengthM ?? 0;
          return { width: w, length: l };
        }
      } catch (e) {
        // ignore
      }
    }
    
    const width = getDeliveryItemWidth(editingItem) || 0;
    return { width, length: 0 };
  }, [editingItem, isRoll]);

  // 💡 LPN 卷卡手動選配狀態
  const [selectedRolls, setSelectedRolls] = useState<any[]>([]);
  const [isLpnModalOpen, setIsLpnModalOpen] = useState(false);
  const [isAllocationModalOpen, setIsAllocationModalOpen] = useState(false);
  const [tempSelectedKeys, setTempSelectedKeys] = useState<React.Key[]>([]);

  // 💡 片料手工輸入 LPN 檢貨數量的狀態
  const [pickedQuantities, setPickedQuantities] = useState<Record<string, number>>({});

  // 💡 智慧計算出貨長度與已配長度/數量
  const calculatedRequiredLength = useMemo(() => {
    if (!editingItem) return 0;
    if (!isRoll) return editingItem.quantity || 0; // 對於片料，出貨量就是 PCS 總數
    
    const width = getDeliveryItemWidth(editingItem) || 0;
    return width > 0 ? ((editingItem.quantity || 0) / (width / 1000)) : 0;
  }, [editingItem, isRoll]);

  const calculatedAllocatedLength = useMemo(() => {
    return selectedRolls.reduce((acc, r) => {
      const qty = Number(r.qtyAux || r.QtyAux || r.currentQtyAux || r.quantity || r.Quantity || 0);
      return acc + qty;
    }, 0);
  }, [selectedRolls]);

  // 當打開 LPN 選擇 Modal 時，將 tempSelectedKeys 初始化為 selectedRolls 已經選中的 LPN
  useEffect(() => {
    if (isLpnModalOpen) {
      setTempSelectedKeys(selectedRolls.map(r => r.rollNo || r.RollNo));
    }
  }, [isLpnModalOpen, selectedRolls]);

  // 💡 撈取該物料當前的可用卷卡清單
  const { data: selectableRollsRes, isFetching: isFetchingSelectable } = useQuery({
    queryKey: ['sales-delivery-selectable-rolls', editingItem?.inventoryCode],
    queryFn: () => getApiV1SalesDeliverySelectableRolls({ query: { materialCode: editingItem?.inventoryCode || '' } }),
    enabled: isLpnModalOpen && !!editingItem && editingItem.inventoryType === 'M',
  });

  const selectableRollsList = (selectableRollsRes?.data as any)?.data || [];

  // 💡 當打開手動檢貨 Modal 時，如果是片材，自動初始化各個 LPN 的檢貨數量
  useEffect(() => {
    if (isLpnModalOpen && !isRoll) {
      const initial: Record<string, number> = {};
      selectedRolls.forEach(r => {
        const rollNo = r.rollNo || r.RollNo;
        initial[rollNo] = Number(r.qtyAux || r.QtyAux || r.currentQtyAux || r.quantity || r.Quantity || 0);
      });
      setPickedQuantities(initial);
    }
  }, [isLpnModalOpen, isRoll]);

  const currentQuantityRef = useRef<number>(0);

  // 💡 智慧 FIFO 自動分配卷卡
  const handleAutoAllocate = async () => {
    if (!editingItem) return;
    
    const reqQty = Number(currentQuantityRef.current || editingItem.quantity || 0);
    if (reqQty <= 0) {
      message.warning('請先輸入本次出貨數量！');
      return;
    }

    const hide = message.loading('正在進行智慧 FIFO 自動分配卷卡...', 0);
    try {
      const allocRes = await getApiV1SalesDeliveryAllocatedRolls({
        query: {
          materialCode: editingItem.inventoryCode || '',
          requiredLength: reqQty,
          requiredWidth: undefined,
          orderLineNumber: editingItem.referenceNumber || undefined
        } as any
      });
      const rolls = (allocRes.data as any)?.data || [];
      
      if (rolls.length === 0) {
        message.warning('倉庫中目前沒有該原料的可出貨 LPN 卷卡庫存！');
      } else {
        const totalLen = rolls.reduce((acc: number, r: any) => acc + (Number(r.qtyAux || r.QtyAux || r.currentQtyAux || 0)), 0);
        setSelectedRolls(rolls);
        message.success(`自動分配成功！已為您依 FIFO 原則選配 ${rolls.length} 卷卷卡，總長度 ${totalLen.toLocaleString()} M`);
      }
    } catch (err: any) {
      message.error('自動分配 LPN 失敗: ' + getApiErrorMessage(err));
    } finally {
      hide();
    }
  };

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

  // 監看關聯產品欄位值，以動態啟用/停用後續欄位與確認按鈕
  const associatedProduct = Form.useWatch('associatedProduct', moldFeeForm);
  const isProductSelected = !!associatedProduct;

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
            StorageCode: 'TW-SCRAP-GEN',
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
      
      // 💡 初始化數量 Ref 防止連動重渲染死鎖
      currentQuantityRef.current = record.quantity || 0;
      
      // 💡 在打開編輯時，一次性且安全地初始化選中的 LPN 卷卡
      let rolls: any[] = [];
      if (record.extraData) {
        try {
          const raw = record.extraData as any;
          rolls = Array.isArray(raw) 
            ? raw 
            : (raw.rootElement 
                ? JSON.parse(raw.rootElement.getRawText()) 
                : JSON.parse(typeof raw === 'string' ? raw : '[]'));
        } catch (e) {
          console.warn('解析 extraData 失敗:', e);
        }
      }
      setSelectedRolls(Array.isArray(rolls) ? rolls : []);
    }
  };

  const handleCancel = () => {
    setEditingItem(null);
    notifyEdit(false);
    setSelectedRolls([]); // 💡 同步安全重置，防止干擾下一筆編輯
    currentQuantityRef.current = 0;
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
        let finalValues = { ...values };
        if (editingItem.inventoryType === 'M') {
          // 💡 如果是物料，將我們手動調整的 LPN rolls 分配、數量、面積覆蓋提交！
          const isRoll = editingItem.unit === 'M' || editingItem.inventoryCode?.startsWith('R');
          if (isRoll && selectedRolls.length > 0) {
            const totalLen = selectedRolls.reduce((acc, r) => acc + (Number(r.qtyAux) || Number(r.currentQtyAux) || 0), 0);
            const totalArea = totalLen * ((Number(selectedRolls[0].widthMm || 500)) / 1000);
            finalValues.quantity = totalLen;
            finalValues.referenceQuantity1 = totalArea;
            finalValues.extraData = selectedRolls;
          }
        }
        await updateMutation.mutateAsync({ lineNumber: editingItem.lineNumber!, values: finalValues });
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
            fields={getItemFormConfig((val) => { currentQuantityRef.current = val; })}
            defaultValues={editingItem || undefined}
            isViewMode={false}
            isUpdateMode={true}
            hideDefaultFooter={true}
            onSubmit={handleSubmit}
          />

          {editingItem && editingItem.inventoryType === 'M' && (
            <div className="mt-4 flex justify-between items-center p-3 rounded-md" style={{ border: '1px solid var(--ant-color-border-secondary)', backgroundColor: 'var(--ant-color-fill-alter)' }}>
              <div className="flex items-center gap-2">
                <span className="font-semibold" style={{ color: 'var(--ant-color-text-secondary)' }}>
                  📦 檢貨狀況(LPN)
                </span>
                <Tag color={selectedRolls.length > 0 ? "success" : "warning"}>
                  {selectedRolls.length > 0 ? `已配 ${selectedRolls.length} 卷` : "未分配"}
                </Tag>
              </div>
              <Button type="primary" onClick={() => setIsAllocationModalOpen(true)}>
                LPN檢貨
              </Button>
            </div>
          )}
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
        destroyOnHidden
      >
        <Spin spinning={loadingStock} tip="正在查詢報廢倉庫存...">
          {addSpareItem && (
            <div className="py-4">
              <Descriptions 
                column={1} 
                size="small" 
                bordered 
                className="mb-4"
                items={[
                  { label: "品名", children: addSpareItem.inventoryName },
                  { label: "料號", children: addSpareItem.inventoryCode },
                  { label: "來源儲位", children: "報廢倉 (TW-SCRAP-GEN)" },
                  { 
                    label: "報廢倉現有庫存", 
                    children: (
                      <span className={scrapStock && scrapStock > 0 ? "text-green-600 font-bold" : "text-red-500 font-bold"}>
                        {scrapStock !== null ? `${scrapStock.toLocaleString()} ${addSpareItem.unit || ''}` : '-'}
                      </span>
                    ) 
                  }
                ]}
              />

              {scrapStock !== null && scrapStock <= 0 ? (
                <div className="text-red-500 font-medium text-center py-2 px-3" style={{ backgroundColor: 'var(--ant-color-error-bg-hover)', borderRadius: '4px' }}>
                  ⚠️ 目前該產品在報廢倉 (TW-SCRAP-GEN) 中無庫存，無法新增備品。
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
        okButtonProps={{ disabled: !isProductSelected }}
        centered
        destroyOnHidden
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
              placeholder={isProductSelected ? "請輸入金額" : "請先選擇關聯產品"}
              precision={0}
              controls={false}
              autoFocus={!isEditingMoldFee}
              disabled={!isProductSelected}
            />
          </Form.Item>
          <Form.Item
            name="notes"
            label="備註"
          >
            <Input 
              placeholder={isProductSelected ? "可輸入備註" : "請先選擇關聯產品"} 
              autoFocus={isEditingMoldFee} 
              disabled={!isProductSelected}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={
          <div className="flex items-center gap-2">
            <span>📦 實物卡檢貨管理</span>
            <span className="text-xs text-gray-400 font-normal">({editingItem?.lineNumber})</span>
          </div>
        }
        open={isAllocationModalOpen}
        onCancel={() => setIsAllocationModalOpen(false)}
        width={650}
        centered
        footer={[
          <Button key="ok" type="primary" onClick={() => setIsAllocationModalOpen(false)}>
            確認並關閉
          </Button>
        ]}
      >
        <div style={{ padding: '12px 0' }}>
          <div className="mb-4 p-3 rounded-md" style={{ backgroundColor: 'var(--ant-color-fill-alter)', border: '1px solid var(--ant-color-border-secondary)' }}>
            <Descriptions column={1} size="small" items={[
              { label: '商品料號', children: editingItem?.inventoryCode },
              { label: '商品名稱', children: editingItem?.inventoryName },
              { 
                label: '出貨量', 
                children: isRoll 
                  ? `${Number(editingItem?.quantity || 0).toLocaleString()} m²` 
                  : `${Number(editingItem?.quantity || 0).toLocaleString()} pcs` 
              },
              { 
                label: '出貨規格', 
                children: isRoll 
                  ? `${getDeliveryItemWidth(editingItem) || 0}mm * ${Number(calculatedRequiredLength.toFixed(2)).toLocaleString()} M` 
                  : `${getDeliveryItemWidth(editingItem) || 0}mm * ${sheetSpec.length}mm` 
              },
              { 
                label: '已檢貨量', 
                children: isRoll ? (
                  <span style={{ color: Math.abs(calculatedAllocatedLength - calculatedRequiredLength) < 0.1 ? 'var(--ant-color-success)' : 'var(--ant-color-warning)', fontWeight: 'bold' }}>
                    {Number(calculatedAllocatedLength.toFixed(2)).toLocaleString()} m
                  </span>
                ) : (
                  <span style={{ color: calculatedAllocatedLength === (editingItem?.quantity || 0) ? 'var(--ant-color-success)' : 'var(--ant-color-warning)', fontWeight: 'bold' }}>
                    {Number(calculatedAllocatedLength).toLocaleString()} pcs
                  </span>
                )
              }
            ]} />
          </div>
          
          <div className="flex justify-between items-center mb-3">
            <span className="font-semibold" style={{ color: 'var(--ant-color-text-secondary)' }}>
              檢貨明細 ({selectedRolls.length} {isRoll ? '卷' : '筆'})
            </span>
            <Space>
              {isRoll && (
                <Button type="primary" size="small" onClick={handleAutoAllocate}>
                  自動檢貨
                </Button>
              )}
              <Button type="dashed" size="small" onClick={() => setIsLpnModalOpen(true)}>
                人工檢貨/調整
              </Button>
            </Space>
          </div>

          {selectedRolls.length === 0 ? (
            <div style={{ color: 'var(--ant-color-text-quaternary)', textAlign: 'center', padding: '24px', border: '1px dashed var(--ant-color-border-secondary)', borderRadius: '6px' }}>
              目前尚未檢貨任何 LPN 卷卡，請點擊「人工檢貨/調整」{isRoll && "或「自動檢貨」"}
            </div>
          ) : (
            <div style={{ 
              maxHeight: '220px', 
              overflowY: 'auto', 
              border: '1px solid var(--ant-color-border-secondary)', 
              borderRadius: '6px', 
              padding: '12px', 
              backgroundColor: 'var(--ant-color-bg-container)' 
            }}>
              <div className="flex flex-wrap gap-2">
                {selectedRolls.map((r, idx) => {
                  const rollNo = r.rollNo || r.RollNo;
                  const qty = Number(r.qtyAux || r.QtyAux || r.currentQtyAux || r.quantity || r.Quantity || 0);
                  const width = r.widthMm || r.WidthMm || 0;
                  return (
                    <Tooltip 
                      key={idx} 
                      title={isRoll ? `寬度: ${width}mm, 成本: ${r.costPerSqm || r.CostPerSqm || 0} SQM/NTD` : `規格: ${width}mm * ${sheetSpec.length}mm`}
                    >
                      <Tag color="blue" style={{ fontSize: '13px', padding: '4px 8px' }}>
                        🎫 {rollNo} ({qty.toLocaleString()} {isRoll ? 'M' : 'pcs'})
                      </Tag>
                    </Tooltip>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </Modal>

      <Modal
        title={`手動檢貨 LPN (物料: ${editingItem?.inventoryCode || ''})`}
        open={isLpnModalOpen}
        width={850}
        centered
        styles={{
          body: {
            height: 'calc(80vh - 120px)',
            padding: '12px 0 0 0',
          }
        }}
        onOk={() => {
          // 當點擊確認時，將勾選的 LPN 資訊回填給 selectedRolls
          const selected = selectableRollsList.filter((r: any) => tempSelectedKeys.includes(r.rollNo || r.RollNo));
          
          if (!isRoll) {
            // 片料檢驗：每個 LPN 檢貨數量驗證
            for (const r of selected) {
              const rNo = r.rollNo || r.RollNo;
              const maxQty = Number(r.currentQtyAux || r.CurrentQtyAux || 0);
              const pickQty = pickedQuantities[rNo] || 0;
              if (pickQty <= 0) {
                message.error(`卷卡 ${rNo} 的檢貨數量必須大於 0！`);
                return;
              }
              if (pickQty > maxQty) {
                message.error(`卷卡 ${rNo} 的檢貨數量 (${pickQty}) 超出了其最大可用數量 (${maxQty})！`);
                return;
              }
            }
            
            // 總數量驗證
            const totalPicked = selected.reduce((acc: number, r: any) => acc + (pickedQuantities[r.rollNo || r.RollNo] || 0), 0);
            const requiredQty = editingItem?.quantity || 0;
            if (totalPicked > requiredQty) {
              message.error(`檢貨總數量 (${totalPicked.toLocaleString()} PCS) 不可超過出貨量 (${requiredQty.toLocaleString()} PCS)！`);
              return;
            }
            
            const mappedSelected = selected.map((r: any) => ({
              rollNo: r.rollNo || r.RollNo,
              qtyAux: pickedQuantities[r.rollNo || r.RollNo] || 0,
              widthMm: r.widthMm || r.WidthMm || 0,
              costPerSqm: r.costPerSqm || r.CostPerSqm || 0,
            }));
            setSelectedRolls(mappedSelected);
            setIsLpnModalOpen(false);
            message.success(`手動檢貨成功！已檢貨 ${mappedSelected.length} 筆，總計 ${totalPicked.toLocaleString()} PCS`);
          } else {
            // 捲料處理
            const mappedSelected = selected.map((r: any) => ({
              rollNo: r.rollNo || r.RollNo,
              qtyAux: r.currentQtyAux || r.CurrentQtyAux || 0,
              widthMm: r.widthMm || r.WidthMm || 0,
              costPerSqm: r.costPerSqm || r.CostPerSqm || 0,
            }));
            setSelectedRolls(mappedSelected);
            setIsLpnModalOpen(false);
            message.success(`手動檢貨成功！已檢貨 ${mappedSelected.length} 卷，總計 ${mappedSelected.reduce((acc: number, r: any) => acc + r.qtyAux, 0).toLocaleString()} M`);
          }
        }}
        onCancel={() => setIsLpnModalOpen(false)}
        destroyOnHidden
      >
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
          <div style={{ color: 'var(--ant-color-text-secondary)', marginBottom: '12px', flexShrink: 0 }}>
            🔔 系統已為您過濾當前可用狀態（Available）且寬度符合出貨要求的實物卷卡。
          </div>
          
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <Table
              size="small"
              loading={isFetchingSelectable}
              dataSource={selectableRollsList}
              rowKey={(record: any) => record.rollNo || record.RollNo}
              pagination={false}
              scroll={{ y: 'calc(80vh - 260px)' }}
            columns={[
              { title: '🎫 卷卡號 (LPN)', dataIndex: 'rollNo', key: 'rollNo' },
              { title: '寬度(mm)', dataIndex: 'widthMm', key: 'widthMm', align: 'right' },
              { 
                title: isRoll ? '剩餘長度(M)' : '剩餘數量(pcs)', 
                dataIndex: 'currentQtyAux', 
                key: 'currentQtyAux', 
                align: 'right',
                render: (val: any) => Number(val).toLocaleString() 
              },
              ...(!isRoll ? [{
                title: '本次檢貨數量(pcs)',
                key: 'pickedQty',
                width: 160,
                align: 'right' as const,
                render: (_: any, r: any) => {
                  const rollNo = r.rollNo || r.RollNo;
                  const isChecked = tempSelectedKeys.includes(rollNo);
                  const maxQty = r.currentQtyAux || r.CurrentQtyAux || 0;
                  const val = pickedQuantities[rollNo] ?? maxQty;
                  
                  return (
                    <InputNumberComponent
                      size="small"
                      min={1}
                      max={maxQty}
                      disabled={!isChecked}
                      value={isChecked ? val : undefined}
                      onChange={(newVal: any) => {
                        const num = Number(newVal) || 0;
                        setPickedQuantities(prev => ({
                          ...prev,
                          [rollNo]: num
                        }));
                      }}
                      style={{ width: '100%' }}
                    />
                  );
                }
              }] : []),
              { 
                title: '是否用過', 
                key: 'isUsed', 
                render: (_: any, r: any) => {
                  const used = Number(r.currentQtyAux) < Number(r.originalQtyAux);
                  return used ? <Tag color="warning">餘料卷</Tag> : <Tag color="success">全新卷</Tag>;
                } 
              },
              { title: '批號', dataIndex: 'lotNo', key: 'lotNo' },
              { title: '成本(SQM)', dataIndex: 'costPerSqm', key: 'costPerSqm', align: 'right' },
            ]}
            rowSelection={{
              selectedRowKeys: tempSelectedKeys,
              onChange: (keys) => {
                setTempSelectedKeys(keys);
                if (!isRoll) {
                  setPickedQuantities(prev => {
                    const next = { ...prev };
                    keys.forEach(k => {
                      const keyStr = String(k);
                      if (next[keyStr] === undefined || next[keyStr] === 0) {
                        const lpn = selectableRollsList.find((r: any) => (r.rollNo || r.RollNo) === keyStr);
                        next[keyStr] = Number(lpn?.currentQtyAux || lpn?.CurrentQtyAux || 0);
                      }
                    });
                    // Clean up unchecked keys
                    Object.keys(next).forEach(k => {
                      if (!keys.includes(k)) {
                        delete next[k];
                      }
                    });
                    return next;
                  });
                }
              },
            }}
          />
          </div>
          
          <div className="mt-4 flex justify-between" style={{ fontSize: '14px', borderTop: '1px solid var(--ant-color-border-secondary)', paddingTop: '12px', flexShrink: 0 }}>
            <span style={{ color: 'var(--ant-color-text-secondary)' }}>
              目前在庫符合卷數: <strong>{selectableRollsList.length}</strong> 卷/筆
            </span>
            <span style={{ color: 'var(--ant-color-text-primary)' }}>
              已勾選: <strong className="text-blue-600">{tempSelectedKeys.length}</strong> 卷/筆，
              {isRoll ? "出貨長度小計" : "出貨數量小計"}: <strong className="text-green-600">
                {isRoll ? (
                  selectableRollsList
                    .filter((r: any) => tempSelectedKeys.includes(r.rollNo || r.RollNo))
                    .reduce((acc: number, r: any) => acc + (Number(r.currentQtyAux) || 0), 0)
                    .toLocaleString() + " M"
                ) : (
                  selectableRollsList
                    .filter((r: any) => tempSelectedKeys.includes(r.rollNo || r.RollNo))
                    .reduce((acc: number, r: any) => acc + (pickedQuantities[r.rollNo || r.RollNo] || 0), 0)
                    .toLocaleString() + " PCS"
                )}
              </strong>
            </span>
          </div>
        </div>
      </Modal>
    </div>
  );
}
