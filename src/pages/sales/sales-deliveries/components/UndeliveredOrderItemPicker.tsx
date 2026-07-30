import React, { useState, useMemo, useEffect } from 'react';
import { Modal, Table, Input, Button, Space, Checkbox, Tooltip, InputNumber, App } from 'antd';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import type { UndeliveredOrderItemsDto, CreateSalesDeliveryItemDto } from '@/api/generated/types.gen';
import { getApiV1OrdersCustomerByCustomerCodeUndeliveredItems } from '@/api/generated/sdk.gen';
import type { TableColumnConfig } from '@/components/Form/types';
import { buildTableColumns } from '@/utils/tableUtils';
import { DictTag } from '@/components/Form/DictTag';

interface Props {
  open: boolean;
  customerCode: string;
  originalOrderItems: string[];
  onClose: () => void;
  onConfirm: (items: CreateSalesDeliveryItemDto[]) => void;
}

export default function UndeliveredOrderItemPicker({ open, customerCode, originalOrderItems, onClose, onConfirm }: Props) {
  const { message } = App.useApp();
  
  const [anyCondition, setAnyCondition] = useState('');
  const [onlyHaveStock, setOnlyHaveStock] = useState(true);
  
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  
  const [checkedRowKeys, setCheckedRowKeys] = useState<React.Key[]>([]);
  const [deliveryQuantities, setDeliveryQuantities] = useState<Record<string, number>>({});
  const [deliveryPrices, setDeliveryPrices] = useState<Record<string, number>>({});

  // Reset state when opening modal
  useEffect(() => {
    if (open) {
      setCheckedRowKeys([]);
      setDeliveryQuantities({});
      setDeliveryPrices({});
    }
  }, [open, customerCode]);

  const { data, isFetching, refetch } = useQuery({
    queryKey: ['undelivered-order-items', customerCode, anyCondition, onlyHaveStock, page, pageSize],
    queryFn: () => getApiV1OrdersCustomerByCustomerCodeUndeliveredItems({
      path: { customerCode },
      query: {
        anyCondition: anyCondition || undefined,
        onlyHaveStock: onlyHaveStock || undefined,
        pageNumber: page,
        pageSize: pageSize,
      }
    }),
    enabled: open && !!customerCode,
  });

  const resData = data?.data as any;
  const pagedResult = resData?.data;
  
  const tableData = useMemo(() => {
    const rawDataArray = (Array.isArray(pagedResult) ? pagedResult : pagedResult?.data) || [];
    const rawData = rawDataArray as UndeliveredOrderItemsDto[];
    
    // Filter out already added order items
    const filteredData = rawData.filter((item: UndeliveredOrderItemsDto) => {
      const key = item.lineNumber || '';
      return !originalOrderItems.includes(key);
    });

    // Sort by remaining quantity and stock
    filteredData.sort((a, b) => {
      const aHasRemaining = (a.quantityRemaining ?? 0) > 0 ? 1 : 0;
      const bHasRemaining = (b.quantityRemaining ?? 0) > 0 ? 1 : 0;
      if (bHasRemaining !== aHasRemaining) return bHasRemaining - aHasRemaining;
      
      const aStockOk = (a.stockQuantity ?? 0) >= (a.quantityRemaining ?? 0) ? 1 : 0;
      const bStockOk = (b.stockQuantity ?? 0) >= (b.quantityRemaining ?? 0) ? 1 : 0;
      return bStockOk - aStockOk;
    });

    return filteredData;
  }, [pagedResult, originalOrderItems]);

  const totalRecords = pagedResult?.totalRecords || (Array.isArray(pagedResult) ? pagedResult.length : 0);

  const handleSearch = () => {
    setPage(1);
    refetch();
  };

  const handleReset = () => {
    setAnyCondition('');
    setOnlyHaveStock(true);
    setPage(1);
    setTimeout(() => refetch(), 0);
  };

  const isRowDisabled = (row: UndeliveredOrderItemsDto) => {
    const remainingQty = Number(row.quantityRemaining) || 0;
    if (row.goodsType === 'M') {
      return remainingQty <= 0;
    }
    const stockQty = Number(row.stockQuantity) || 0;
    return remainingQty <= 0 || stockQty <= 0;
  };

  const selectedItems = useMemo(() => {
    return tableData.filter(item => checkedRowKeys.includes(item.lineNumber || ''));
  }, [tableData, checkedRowKeys]);

  const isAllQuantityValid = useMemo(() => {
    return selectedItems.every(item => {
      const key = item.lineNumber || '';
      const deliveryQty = Number(deliveryQuantities[key]) || 0;
      const remainingQty = Number(item.quantityRemaining) || 0;
      return deliveryQty > 0 && deliveryQty <= remainingQty;
    });
  }, [selectedItems, deliveryQuantities]);

  const onRowSelectionChange = (newSelectedRowKeys: React.Key[], selectedRows: UndeliveredOrderItemsDto[]) => {
    setCheckedRowKeys(newSelectedRowKeys);
    
    const newQuantities = { ...deliveryQuantities };
    const newPrices = { ...deliveryPrices };
    
    // Assign default quantity for newly selected rows
    selectedRows.forEach(item => {
      const key = item.lineNumber || '';
      if (newQuantities[key] === undefined) {
        // 計算常規剩餘可用額度，作為預設出貨數量（不含備品，因為備品僅為參考用途）
        const regularQty = Number(item.quantity) || 0;
        const shippedQty = Number(item.quantityShipped) || 0;
        const cancelledQty = Number(item.quantityCancelled) || 0;
        const remainingRegularQty = Math.max(0, regularQty - shippedQty - cancelledQty);

        const stockQty = item.stockQuantity || 0;
        const maxQty = item.goodsType === 'M' ? remainingRegularQty : Math.min(remainingRegularQty, stockQty);
        newQuantities[key] = maxQty > 0 ? maxQty : 0;
      }
      if (newPrices[key] === undefined) {
        newPrices[key] = Number(item.unitPrice) || 0;
      }
    });

    // Clean up unselected rows
    Object.keys(newQuantities).forEach(key => {
      if (!newSelectedRowKeys.includes(key)) {
        delete newQuantities[key];
        delete newPrices[key];
      }
    });

    setDeliveryQuantities(newQuantities);
    setDeliveryPrices(newPrices);
  };

  const handleConfirm = () => {
    if (selectedItems.length === 0) {
      message.warning('請至少選擇一項訂單明細');
      return;
    }

    if (!isAllQuantityValid) {
      message.error('請檢查出貨數量設定，數量必須大於0且不可超過剩餘數量');
      return;
    }

    // 1. 建立扁平的「分攤單元」列表
    interface AllocationUnit {
      orderItemLineNumber: string;
      goodsCode: string;
      goodsName: string;
      goodsType: string;
      customerPoNumber: string;
      customerProductId: string;
      transactionType: 'INV' | 'SP';
      unitPrice: number;
      quantity: number;
      unit?: string;
      notes?: string;
      widthMm?: number;
      lengthM?: number;
    }

    const allocationUnits: AllocationUnit[] = [];

    selectedItems.forEach(item => {
      const key = item.lineNumber || '';
      const deliveryQty = Number(deliveryQuantities[key]) || 0;
      const unitPrice = deliveryPrices[key] !== undefined ? Number(deliveryPrices[key]) : (Number(item.unitPrice) || 0);
      const unit = item.unit || '';

      // 計算常規可出貨餘額：常規數量 - 已出貨 - 已取消
      const regularQty = Number(item.quantity) || 0;
      const shippedQty = Number(item.quantityShipped) || 0;
      const cancelledQty = Number(item.quantityCancelled) || 0;
      const remainingRegularQty = Math.max(0, regularQty - shippedQty - cancelledQty);

      if (deliveryQty > remainingRegularQty) {
        // 部分常規，部分備品
        if (remainingRegularQty > 0) {
          allocationUnits.push({
            orderItemLineNumber: item.lineNumber || '',
            goodsCode: item.goodsCode || '',
            goodsName: item.goodsName || '',
            goodsType: item.goodsType || '',
            customerPoNumber: item.customerPoNumber || '',
            customerProductId: item.customerProductId || '',
            transactionType: 'INV',
            unitPrice: unitPrice,
            quantity: remainingRegularQty,
            unit: unit,
            notes: item.notes || '',
            widthMm: (item as any).widthMm || (item as any).WidthMm,
            lengthM: (item as any).lengthM || (item as any).LengthM,
          });
        }

        const spareQtyToShip = deliveryQty - remainingRegularQty;
        if (spareQtyToShip > 0) {
          allocationUnits.push({
            orderItemLineNumber: item.lineNumber || '',
            goodsCode: item.goodsCode || '',
            goodsName: item.goodsName || '',
            goodsType: item.goodsType || '',
            customerPoNumber: item.customerPoNumber || '',
            customerProductId: item.customerProductId || '',
            transactionType: 'SP',
            unitPrice: 0, // 備品單價強製為 0
            quantity: spareQtyToShip,
            unit: unit,
            notes: item.notes || '',
            widthMm: (item as any).widthMm || (item as any).WidthMm,
            lengthM: (item as any).lengthM || (item as any).LengthM,
          });
        }
      } else {
        // 全部常規
        if (deliveryQty > 0) {
          allocationUnits.push({
            orderItemLineNumber: item.lineNumber || '',
            goodsCode: item.goodsCode || '',
            goodsName: item.goodsName || '',
            goodsType: item.goodsType || '',
            customerPoNumber: item.customerPoNumber || '',
            customerProductId: item.customerProductId || '',
            transactionType: 'INV',
            unitPrice: unitPrice,
            quantity: deliveryQty,
            unit: unit,
            notes: item.notes || '',
            widthMm: (item as any).widthMm || (item as any).WidthMm,
            lengthM: (item as any).lengthM || (item as any).LengthM,
          });
        }
      }
    });

    // 2. 將分攤單元依據「商品編碼 + 單價 + 出貨類型 (INV/SP)」進行合併 (Group By)
    const groups: Record<string, {
      units: AllocationUnit[];
      goodsCode: string;
      goodsName: string;
      goodsType: string;
      unitPrice: number;
      transactionType: 'INV' | 'SP';
      totalQuantity: number;
      unit?: string;
    }> = {};

    allocationUnits.forEach(unit => {
      // 合併 Key：編碼 + 單價 + 交易類型
      const groupKey = `${unit.goodsCode}_${unit.unitPrice}_${unit.transactionType}`;
      if (!groups[groupKey]) {
        groups[groupKey] = {
          units: [],
          goodsCode: unit.goodsCode,
          goodsName: unit.goodsName,
          goodsType: unit.goodsType,
          unitPrice: unit.unitPrice,
          transactionType: unit.transactionType,
          totalQuantity: 0,
          unit: unit.unit,
        };
      }
      groups[groupKey].units.push(unit);
      groups[groupKey].totalQuantity += unit.quantity;
    });

    // 3. 轉換為後端接收的 CreateSalesDeliveryItemDto[]
    const salesDeliveryItems: CreateSalesDeliveryItemDto[] = Object.values(groups).map(g => {
      // 用於外鍵約束：ReferenceNumber 必須是指向其中一筆參與合併的合法 OrderItemLineNumber 
      const primaryLineNumber = g.units[0].orderItemLineNumber;

      // 建立分攤明細 ExtraData (物件陣列)
      const extraDataList = g.units.map(u => ({
        OrderItemLineNumber: u.orderItemLineNumber,
        Quantity: u.quantity,
        WidthMm: u.widthMm,
        widthMm: u.widthMm,
        LengthM: u.lengthM,
        lengthM: u.lengthM,
      }));

      // 客戶訂單號 (多筆合併時，將多張 PO 串接去重，方便畫面識別)
      const poNumbers = Array.from(new Set(g.units.map(u => u.customerPoNumber).filter(Boolean)));
      const partnerDocNum = poNumbers.join(',') || g.units[0].customerPoNumber || '';

      // 客戶產品編碼
      const prodIds = Array.from(new Set(g.units.map(u => u.customerProductId).filter(Boolean)));
      const partnerProdId = prodIds.join(',') || g.units[0].customerProductId || '';

      // 建構出貨明細
      const itemDto: any = {
        referenceNumber: primaryLineNumber, // 滿足資料庫的外鍵約束 (FK Constraint)
        inventoryType: g.goodsType,
        inventoryCode: g.goodsCode,
        inventoryName: g.goodsName,
        unit: g.unit, // 🌟 帶入單位！
        subType: g.goodsType === 'O' ? 'OF' : 'OD',
        transactionType: g.transactionType,
        partnerDocumentNumber: partnerDocNum,
        partnerProductId: partnerProdId,
        unitPrice: g.unitPrice,
        quantity: g.totalQuantity,
        sourceStorageCode: g.goodsType === 'O' ? undefined : 'TW-FG-GEN',
        notes: g.units.map(u => u.notes).filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join('; ') || '',
        extraData: extraDataList, // 後端認可的 JSON 格式 (在 ASP.NET Core 端會自動被對應為 JsonDocument)
      };

      return itemDto as CreateSalesDeliveryItemDto;
    });

    onConfirm(salesDeliveryItems);
  };

  const columns = useMemo(() => {
    const configs: TableColumnConfig<UndeliveredOrderItemsDto>[] = [
      { label: '訂單單號項次', name: 'lineNumber', width: 160, fixed: 'left' },
      { label: '商品類型', name: 'goodsType', width: 80, render: (val: any) => {
          return <DictTag dictKey="PRODUCT_TYPE" value={val} />;
        }
      },      { label: '商品編碼', name: 'goodsCode', width: 150, ellipsis: true  },
      { label: '商品名稱', name: 'goodsName', width: 200, ellipsis: true },
      { 
        label: '規格 (寬*長)', 
        name: 'specification' as any, 
        width: 130, 
        render: (_: any, row: UndeliveredOrderItemsDto) => {
          if (row.goodsType === 'M') {
            const w = (row as any).widthMm || (row as any).WidthMm;
            const l = (row as any).lengthM || (row as any).LengthM;
            return `${w ? `${w}mm` : '-'}${l ? ` * ${l}M` : ''}`;
          }
          return '-';
        } 
      },

      { 
        label: '訂單數量', 
        name: 'quantity', 
        width: 100, 
        align: 'right', 
        render: (_: any, row: UndeliveredOrderItemsDto) => {
          const qty = (row.quantity || 0) + (row.spareQuantity || 0);
          return qty.toLocaleString();
        } 
      },
      { label: '已出貨數量', name: 'quantityShipped', width: 100, align: 'right', render: (val: any) => val != null ? Number(val).toLocaleString() : '0' },
      { 
        label: '剩餘數量', 
        name: 'quantityRemaining', 
        width: 100, 
        align: 'right', 
        render: (val: any) => <span style={{ fontWeight: 'bold', color: '#18a058' }}>{val != null ? Number(val).toLocaleString() : '0'}</span> 
      },
      { 
        label: '現有庫存量', 
        name: 'stockQuantity', 
        width: 100, 
        align: 'right', 
        render: (val: any) => {
          return <span style={{ fontWeight: 'bold', color: '#faad14' }}>{val != null ? Number(val).toLocaleString() : '0'}</span>;
        } 
      },
      { label: '要求交期', name: 'requestedDeliveryDate', width: 100, render: (val: any) => val ? dayjs(val).format('YYYY-MM-DD') : '' },
      { 
        label: '單價', 
        name: 'unitPrice', 
        width: 110, 
        align: 'right', 
        render: (_: any, row: UndeliveredOrderItemsDto) => {
          const key = row.lineNumber || '';
          const isChecked = checkedRowKeys.includes(key);
          const price = deliveryPrices[key] !== undefined ? deliveryPrices[key] : (Number(row.unitPrice) || 0);

          return (
            <Tooltip title={!isChecked ? "請先勾選此項目" : ""} placement="top">
              <InputNumber
                value={price}
                disabled={!isChecked}
                controls={false}
                min={0}
                size="small"
                onFocus={(e) => e.target.select()}
                onChange={(val) => {
                  if (val !== null) {
                    setDeliveryPrices(prev => ({ ...prev, [key]: Number(val) }));
                  }
                }}
                style={{ width: '100px' }}
              />
            </Tooltip>
          );
        }
      },
      {
        label: '本次出貨量',
        name: 'deliveryQuantity' as any,
        width: 120,
        align: 'right',
        render: (_: any, row: UndeliveredOrderItemsDto) => {
          const key = row.lineNumber || '';
          const isChecked = checkedRowKeys.includes(key);
          const qty = deliveryQuantities[key] || 0;
          const remainingQty = Number(row.quantityRemaining) || 0;
          const stockQty = Number(row.stockQuantity) || 0;
          const maxLimit = row.goodsType === 'M' ? remainingQty : Math.min(remainingQty, stockQty);
          
          let status: "" | "error" | "warning" = "";
          if (isChecked) {
            if (qty > remainingQty) status = "error";
            else if (qty <= 0) status = "warning";
          }

          return (
            <Tooltip title={!isChecked ? "請先勾選此項目" : ""} placement="top">
              <InputNumber
                id={`qty-input-${key}`}
                value={isChecked ? qty : undefined}
                disabled={!isChecked}
                controls={false}
                min={0}
                max={maxLimit}
                size="small"
                status={status}
                placeholder="0.00"
                onFocus={(e) => e.target.select()}
                onChange={(value) => {
                  setDeliveryQuantities(prev => ({ ...prev, [key]: value || 0 }));
                }}
                style={{ width: 100 }}
              />
            </Tooltip>
          );
        }
      },
      { label: '單位', name: 'unit', width: 80, render: (val: any) => val || '-' },
      {
        label: '小計',
        name: 'subTotal' as any,
        width: 120,
        align: 'right',
        render: (_: any, row: UndeliveredOrderItemsDto) => {
          const key = row.lineNumber || '';
          const isChecked = checkedRowKeys.includes(key);
          if (!isChecked) return '0';
          
          const price = deliveryPrices[key] !== undefined ? deliveryPrices[key] : (Number(row.unitPrice) || 0);
          const qty = deliveryQuantities[key] || 0;
          return (price * qty).toLocaleString();
        }
      },      
      { label: '備品數量', name: 'spareQuantity', width: 100, align: 'right', render: (val: any) => val != null ? Number(val).toLocaleString() : '0' },
      { label: '製令單號', name: 'workOrderNumber', width: 120, ellipsis: true, render: (val: any) => val || '-' },
      { label: '備註', name: 'notes', width: 150, ellipsis: true },
    ];

    return buildTableColumns(configs, undefined, undefined, { showAudit: false });
  }, [checkedRowKeys, deliveryPrices, deliveryQuantities, tableData]);

  return (
    <Modal
      title="挑選未出貨訂單明細"
      open={open}
      onCancel={onClose}
      mask={{ closable: false }}
      keyboard={false}
      width="90vw"
      style={{ top: 20 }}
      styles={{ body: { height: '70vh', display: 'flex', flexDirection: 'column' } }}
      footer={
        <Space>
          <Button onClick={onClose}>取消</Button>
          <Button 
            type="primary" 
            onClick={handleConfirm}
            disabled={selectedItems.length === 0 || !isAllQuantityValid}
          >
            確認選擇 ({selectedItems.length})
          </Button>
        </Space>
      }
    >
      <div className="flex flex-col h-full">
        {/* 搜尋區域 */}
        <div className="mb-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-md">
          <Space>
            <Input 
              value={anyCondition} 
              onChange={e => setAnyCondition(e.target.value)} 
              placeholder="搜尋商品編碼或名稱" 
              style={{ width: 300 }}
              onPressEnter={handleSearch}
              allowClear
            />
            <Button type="primary" onClick={handleSearch} loading={isFetching}>搜尋</Button>
            <Button onClick={handleReset}>清除</Button>
            <Checkbox 
              checked={onlyHaveStock} 
              onChange={e => {
                setOnlyHaveStock(e.target.checked);
                setPage(1);
                setTimeout(() => refetch(), 0);
              }}
            >
              只顯示有庫存的項目
            </Checkbox>
          </Space>
        </div>

        {/* 表格區域 */}
        <div className="flex-1 overflow-hidden">
          <Table
            columns={columns}
            dataSource={tableData}
            rowKey="lineNumber"
            loading={isFetching}
            scroll={{ x: 1500, y: 'calc(70vh - 200px)' }}
            size="small"
            pagination={{
              current: page,
              pageSize: pageSize,
              total: totalRecords,
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50', '100'],
              showTotal: (total) => `共 ${total} 項`,
              onChange: (p, s) => {
                setPage(p);
                setPageSize(s);
              }
            }}
            rowSelection={{
              fixed: 'left',
              selectedRowKeys: checkedRowKeys,
              onChange: onRowSelectionChange,
              onSelect: (record, selected) => {
                if (selected) {
                  setTimeout(() => {
                    const el = document.getElementById(`qty-input-${record.lineNumber}`);
                    if (el) el.focus();
                  }, 50);
                }
              },
              getCheckboxProps: (record) => ({
                disabled: isRowDisabled(record),
              }),
            }}
            rowClassName={(record) => {
              if (isRowDisabled(record)) {
                return 'disabled-table-row';
              }
              return '';
            }}
          />
        </div>
      </div>
    </Modal>
  );
}
