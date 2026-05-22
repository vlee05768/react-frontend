import { useState, useMemo, useEffect } from 'react';
import { Modal, Table, Input, Button, Space, InputNumber, Tag, DatePicker, theme, App, message as antdMessage } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { getApiV1ProductCustomerByCustomerCodeSearch } from '@/api/generated/sdk.gen';
import type { ProductDto, OrderItemDto } from '@/api/generated/types.gen';
import { DEFAULT_PAGE_SIZE } from '@/constants';
import { MODAL_WIDTH_PICK, MODAL_PICK_BODY_MAX_HEIGHT } from '@/constants/ui';
import { DictTag } from '@/components/Form/DictTag';

interface DeliveryAllocation {
  id: string;
  unitPrice: number;
  quantity: number | null;
  requestedDeliveryDate: string | null;
  lineNumber?: string; // 記錄對應的原本明細 LineNumber
}

interface SelectedProduct {
  code: string;
  name: string;
  customerProductId?: string;
  unitPrice: number; // 產品主檔預設單價
  allocations: DeliveryAllocation[];
}

interface Props {
  open: boolean;
  onCancel: () => void;
  onConfirm: (selectedProducts: any[]) => void;
  customerCode: string;
  excludeProductCodes?: string[];
  loading?: boolean;
  defaultDeliveryDate?: string; // 訂單要求交期
  initialItems?: OrderItemDto[]; // 傳入目前已存在的訂單明細
}

export function CustomerProductPickerModal({ 
  open, 
  onCancel, 
  onConfirm, 
  customerCode,
  excludeProductCodes = [],
  loading: isSubmitting = false,
  defaultDeliveryDate,
  initialItems = []
}: Props) {
  const { token } = theme.useToken();
  const { message: contextMessage } = App.useApp() || {};
  const message = contextMessage || antdMessage;
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  
  // 記錄選取的產品及其子分配 (複數交期與數量)
  const [selectedMap, setSelectedMap] = useState<Map<string, SelectedProduct>>(new Map());
  // 記錄展開的列 key
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);

  const [inputValue, setInputValue] = useState('');

  // 重置狀態當 Modal 開啟時，並將現有訂單明細展開載入
  useEffect(() => {
    if (open) {
      setInputValue('');
      setSearchTerm('');
      setPage(1);
      
      const newMap = new Map<string, SelectedProduct>();
      
      if (initialItems && initialItems.length > 0) {
        initialItems.forEach(item => {
          if (!item.goodsCode) return;
          
          const existing = newMap.get(item.goodsCode);
          const alloc: DeliveryAllocation = {
            id: item.lineNumber || Math.random().toString(36).substring(2, 9),
            unitPrice: item.unitPrice || 0,
            quantity: item.quantity || 0,
            requestedDeliveryDate: item.requestedDeliveryDate || null,
            lineNumber: item.lineNumber || undefined
          };

          if (existing) {
            existing.allocations.push(alloc);
          } else {
            newMap.set(item.goodsCode, {
              code: item.goodsCode,
              name: item.goodsName || '',
              customerProductId: item.customerProductId || undefined,
              unitPrice: item.unitPrice || 0,
              allocations: [alloc]
            });
          }
        });
      }

      setSelectedMap(newMap);
      setExpandedKeys(Array.from(newMap.keys()));
    }
  }, [open, initialItems]);

  const { data, isLoading } = useQuery({
    queryKey: ['customer-products', customerCode, searchTerm, page, pageSize, excludeProductCodes],
    queryFn: () => getApiV1ProductCustomerByCustomerCodeSearch({
      path: { customerCode },
      query: {
        CodeOrName: searchTerm || undefined,
        ExcludeProductsCode: excludeProductCodes.length > 0 ? excludeProductCodes : undefined,
        pageNumber: page,
        pageSize: pageSize,
      }
    }),
    enabled: open && !!customerCode,
  });

  const rawProducts: ProductDto[] = data?.data?.data?.data || [];
  const totalCount = data?.data?.data?.totalRecords || 0;

  // 過濾排除的產品
  const displayProducts = useMemo(() => {
    return rawProducts.filter(p => p.code && !excludeProductCodes.includes(p.code));
  }, [rawProducts, excludeProductCodes]);

  const handleSelectChange = (selectedRowKeys: React.Key[], selectedRows: ProductDto[]) => {
    const newMap = new Map(selectedMap);
    
    // 1. 移除目前頁面未選取的項目
    const currentPageKeys = displayProducts.map(p => p.code!);
    currentPageKeys.forEach(key => {
      if (!selectedRowKeys.includes(key)) {
        newMap.delete(key);
      }
    });

    // 2. 新增剛勾選的項目
    selectedRows.forEach(row => {
      if (row && row.code && !newMap.has(row.code)) {
        newMap.set(row.code, {
          code: row.code,
          name: row.name || '',
          customerProductId: row.customerProductId || undefined,
          unitPrice: row.unitPrice || 0,
          allocations: [
            {
              id: Math.random().toString(36).substring(2, 9),
              unitPrice: row.unitPrice || 0,
              quantity: 1,
              requestedDeliveryDate: defaultDeliveryDate || null
            }
          ]
        });
      }
    });

    setSelectedMap(newMap);
    // 自動展開已選取的產品列
    setExpandedKeys(Array.from(newMap.keys()));
  };

  const handlePriceChange = (code: string, allocId: string, val: number | null) => {
    const newMap = new Map(selectedMap);
    const item = newMap.get(code);
    if (item) {
      const updated = item.allocations.map(a => 
        a.id === allocId ? { ...a, unitPrice: val || 0 } : a
      );
      newMap.set(code, { ...item, allocations: updated });
      setSelectedMap(newMap);
    }
  };

  const handleQuantityChange = (code: string, allocId: string, val: number | null) => {
    const newMap = new Map(selectedMap);
    const item = newMap.get(code);
    if (item) {
      const updated = item.allocations.map(a => 
        a.id === allocId ? { ...a, quantity: val } : a
      );
      newMap.set(code, { ...item, allocations: updated });
      setSelectedMap(newMap);
    }
  };

  const handleDateChange = (code: string, allocId: string, date: dayjs.Dayjs | null) => {
    const newMap = new Map(selectedMap);
    const item = newMap.get(code);
    if (item) {
      const updated = item.allocations.map(a => 
        a.id === allocId ? { ...a, requestedDeliveryDate: date ? date.format('YYYY-MM-DD') : null } : a
      );
      newMap.set(code, { ...item, allocations: updated });
      setSelectedMap(newMap);
    }
  };

  // Rule 1 & Rule 2: 新增項目控制
  const handleAddAllocation = (code: string) => {
    const newMap = new Map(selectedMap);
    const item = newMap.get(code);
    if (item) {
      // Rule 2: 新增時檢查如果有CRD是空白, 則不繼續新增
      const hasEmptyCrd = item.allocations.some(a => !a.requestedDeliveryDate);
      if (hasEmptyCrd) {
        message.error('請先填寫現有的要求交期，再新增新交期');
        return;
      }

      // Rule 1: 如果有上一筆項目, 則交貨數量與單價都由上一筆複製過來；CRD 保持空白
      const lastAlloc = item.allocations[item.allocations.length - 1];
      const newUnitPrice = lastAlloc ? lastAlloc.unitPrice : (item.unitPrice || 0);
      const newQuantity = lastAlloc ? lastAlloc.quantity : 1;

      newMap.set(code, {
        ...item,
        allocations: [
          ...item.allocations,
          {
            id: Math.random().toString(36).substring(2, 9),
            unitPrice: newUnitPrice,
            quantity: newQuantity,
            requestedDeliveryDate: null // CRD 保持空白
          }
        ]
      });
      setSelectedMap(newMap);
    }
  };

  const handleRemoveAllocation = (code: string, allocId: string) => {
    const newMap = new Map(selectedMap);
    const item = newMap.get(code);
    if (item && item.allocations.length > 1) {
      newMap.set(code, {
        ...item,
        allocations: item.allocations.filter(a => a.id !== allocId)
      });
      setSelectedMap(newMap);
    }
  };

  const handleClearSelection = () => {
    setSelectedMap(new Map());
    setExpandedKeys([]);
  };

  // Rule 6: 點選確認選擇時，統一進行 Validation 檢查
  const handleConfirm = () => {
    const finalItems: any[] = [];
    let isValid = true;

    for (const item of selectedMap.values()) {
      const dates = new Set<string>();
      
      for (const alloc of item.allocations) {
        // Rule 2: 檢查要求交期 (CRD) 是否空白
        if (!alloc.requestedDeliveryDate) {
          message.error(`產品「${item.name}」的要求交期 (CRD) 未填寫，請選擇交期`);
          isValid = false;
          break;
        }

        // Rule 3: 檢查要求交期 (CRD) 是否重複
        if (dates.has(alloc.requestedDeliveryDate)) {
          message.error(`產品「${item.name}」有重複的要求交期 ${alloc.requestedDeliveryDate}，交期不可以相同`);
          isValid = false;
          break;
        }
        dates.add(alloc.requestedDeliveryDate);

        // 基本數量檢查
        const qty = alloc.quantity;
        if (qty === null || qty === undefined || qty <= 0) {
          message.error(`產品「${item.name}」的交貨數量必須大於 0`);
          isValid = false;
          break;
        }

        // 基本單價檢查
        if (alloc.unitPrice < 0) {
          message.error(`產品「${item.name}」的單價不可低於 0`);
          isValid = false;
          break;
        }

        finalItems.push({
          code: item.code,
          name: item.name,
          customerProductId: item.customerProductId,
          orderUnitPrice: alloc.unitPrice,
          orderQuantity: alloc.quantity,
          requestedDeliveryDate: alloc.requestedDeliveryDate,
          lineNumber: alloc.lineNumber
        });
      }

      if (!isValid) break;
    }

    if (!isValid) return;
    onConfirm(finalItems);
  };

  const columns = [
    { title: '產品代碼', dataIndex: 'code', key: 'code', width: 120, align: 'left' as const, ellipsis: true },
    { title: '產品名稱', dataIndex: 'name', key: 'name', width: 180, ellipsis: true, align: 'left' as const },
    { title: '客戶產品代碼', dataIndex: 'customerProductId', key: 'customerProductId', width: 130, align: 'left' as const, ellipsis: true },
    {
      title: '標準單價',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      width: 100,
      align: 'right' as const,
      render: (val: number) => val !== undefined ? `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '-'
    },
    {
      title: '分配交期 & 數量',
      key: 'allocationSummary',
      width: 210,
      align: 'left' as const,
      render: (_: any, record: ProductDto) => {
        const isSelected = selectedMap.has(record.code!);
        if (!isSelected) {
          return <span className="text-gray-400 text-xs">未勾選</span>;
        }
        const item = selectedMap.get(record.code!)!;
        const count = item.allocations.length;
        const totalQty = item.allocations.reduce((sum, a) => sum + (a.quantity || 0), 0);
        return (
          <Tag color="success" style={{ margin: 0 }}>
            {count} 筆交期 / 共 {totalQty.toLocaleString()} 雙/PCS (展開編輯)
          </Tag>
        );
      }
    },
    {
      title: '類型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      align: 'center' as const,
      render: (val: string) => <DictTag dictKey="PRODUCT_TYPE" value={val} />
    },
    { title: '單位', dataIndex: 'unit', key: 'unit', width: 80, align: 'center' as const },
  ];

  const expandedRowRender = (record: ProductDto) => {
    const selectedItem = selectedMap.get(record.code!);
    if (!selectedItem) {
      return (
        <div style={{ padding: '8px 16px', color: token.colorTextTertiary, fontSize: '13px' }}>
          請先勾選此產品以進行交期與數量分配。
        </div>
      );
    }

    const subColumns = [
      {
        title: '要求交期 (CRD)',
        dataIndex: 'requestedDeliveryDate',
        key: 'requestedDeliveryDate',
        width: 180,
        render: (_: any, alloc: DeliveryAllocation) => {
          const currentIndex = selectedItem.allocations.findIndex(a => a.id === alloc.id);
          const prevAlloc = currentIndex > 0 ? selectedItem.allocations[currentIndex - 1] : null;
          const prevCrd = prevAlloc?.requestedDeliveryDate;
          const defaultPickerValue = prevCrd ? dayjs(prevCrd).add(1, 'month') : undefined;

          return (
            <DatePicker
              value={alloc.requestedDeliveryDate ? dayjs(alloc.requestedDeliveryDate) : null}
              defaultPickerValue={defaultPickerValue}
              onChange={(date) => handleDateChange(record.code!, alloc.id, date)}
              size="small"
              style={{ width: '100%' }}
              placeholder="請選擇交期"
            />
          );
        }
      },
      {
        title: '交貨數量',
        dataIndex: 'quantity',
        key: 'quantity',
        width: 140,
        render: (_: any, alloc: DeliveryAllocation) => (
          <InputNumber
            controls={false} // Rule 6: 移除上下紐 controls={false}
            value={alloc.quantity ?? undefined}
            formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={(value) => value!.replace(/\$\s?|(,*)/g, '') as unknown as number}
            onChange={(val) => handleQuantityChange(record.code!, alloc.id, val)}
            onFocus={(e) => e.target.select()}
            size="small"
            style={{ width: '100%' }}
          />
        )
      },
      {
        title: '訂單單價',
        dataIndex: 'unitPrice',
        key: 'unitPrice',
        width: 140,
        render: (_: any, alloc: DeliveryAllocation) => (
          <InputNumber
            min={0}
            precision={4}
            controls={false} // Rule 6: 移除上下紐 controls={false}
            value={alloc.unitPrice}
            formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={(value) => value!.replace(/\$\s?|(,*)/g, '') as unknown as number}
            onChange={(val) => handlePriceChange(record.code!, alloc.id, val)}
            onFocus={(e) => e.target.select()}
            size="small"
            style={{ width: '100%' }}
          />
        )
      },
      {
        title: '操作',
        key: 'actions',
        width: 100,
        align: 'center' as const,
        render: (_: any, alloc: DeliveryAllocation) => {
          // Rule 5: 移除「+拆分」操作按鈕，僅保留「刪除」按鈕
          if (selectedItem.allocations.length > 1) {
            return (
              <Button
                type="link"
                danger
                size="small"
                icon={<DeleteOutlined />}
                onClick={() => handleRemoveAllocation(record.code!, alloc.id)}
              >
                刪除
              </Button>
            );
          }
          return <span style={{ color: token.colorTextTertiary }}>-</span>;
        }
      }
    ];

    return (
      <div style={{ padding: '8px 16px', backgroundColor: token.colorFillAlter, borderRadius: '4px', border: `1px solid ${token.colorBorderSecondary}` }}>
        <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 'bold', fontSize: '13px', color: token.colorPrimary }}>
            🕒 分配交期與數量
          </span>
          {/* Rule 4: 「+拆分新交期」名稱改為「+新交期」 */}
          <Button
            type="primary"
            ghost
            size="small"
            icon={<PlusOutlined />}
            onClick={() => handleAddAllocation(record.code!)}
          >
            +新交期
          </Button>
        </div>
        <Table
          columns={subColumns}
          dataSource={selectedItem.allocations}
          rowKey="id"
          pagination={false}
          size="small"
          bordered
        />
      </div>
    );
  };

  return (
    <Modal
      title={`挑選客戶產品 - ${customerCode}`}
      open={open}
      onCancel={onCancel}
      width={MODAL_WIDTH_PICK}
      centered
      styles={{ body: { height: MODAL_PICK_BODY_MAX_HEIGHT, overflow: 'hidden', display: 'flex', flexDirection: 'column' } }}
      mask={{ closable: false }}
      footer={null}
    >
      <div className="flex justify-between items-center mb-4" style={{flexShrink: 0 }}>
        <Space>
          <Input.Search
            placeholder="搜尋產品名稱或編號"
            allowClear
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onSearch={setSearchTerm}
            style={{ width: 300 }}
          />
          {selectedMap.size > 0 && (
            <>
              <Tag color="processing">已選擇 {selectedMap.size} 項產品</Tag>
              <Button size="small" onClick={handleClearSelection}>清除選擇</Button>
            </>
          )}
        </Space>
        <Space>
          <Button onClick={onCancel}>取消</Button>
          <Button 
            type="primary" 
            disabled={selectedMap.size === 0} 
            loading={isSubmitting}
            onClick={handleConfirm}
          >
            確認選擇
          </Button>
        </Space>
      </div>
      
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <Table
          bordered
          rowSelection={{
            type: 'checkbox',
            selectedRowKeys: Array.from(selectedMap.keys()),
            onChange: handleSelectChange,
            preserveSelectedRowKeys: true,
          }}
          columns={columns}
          dataSource={displayProducts}
          rowKey="code"
          size="small"
          loading={isLoading}
          expandable={{
            expandedRowRender,
            expandedRowKeys: expandedKeys,
            onExpandedRowsChange: (keys) => setExpandedKeys(keys as string[]),
            rowExpandable: (record) => selectedMap.has(record.code!),
          }}
          scroll={{ x: 'max-content', y: `calc(${MODAL_PICK_BODY_MAX_HEIGHT} - 110px)` }}
          pagination={{
            current: page,
            pageSize: pageSize,
            total: totalCount,
            showSizeChanger: true,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
            showTotal: (total) => `共 ${total} 筆`,
          }}
        />
      </div>
    </Modal>
  );
}
