import { useState, useMemo } from 'react';
import { Modal, Table, Input, Button, Space, InputNumber, Tag } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { getApiV1ProductCustomerByCustomerCodeSearch } from '@/api/generated/sdk.gen';
import type { ProductDto } from '@/api/generated/types.gen';
import { DEFAULT_PAGE_SIZE } from '@/constants';
import { DictLabel } from '@/components/Form/DictLabel';

interface SelectedProduct extends ProductDto {
  orderUnitPrice: number;
  orderQuantity: number;
}

interface Props {
  open: boolean;
  onCancel: () => void;
  onConfirm: (selectedProducts: SelectedProduct[]) => void;
  customerCode: string;
  excludeProductCodes?: string[];
  loading?: boolean;
}

export function CustomerProductPickerModal({ 
  open, 
  onCancel, 
  onConfirm, 
  customerCode,
  excludeProductCodes = [],
  loading: isSubmitting = false
}: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  
  // Track selected products across pages
  const [selectedMap, setSelectedMap] = useState<Map<string, SelectedProduct>>(new Map());

  const { data, isLoading } = useQuery({
    queryKey: ['customer-products', customerCode, searchTerm, page, pageSize],
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

  // Filter out excluded products
  const displayProducts = useMemo(() => {
    return rawProducts.filter(p => p.code && !excludeProductCodes.includes(p.code));
  }, [rawProducts, excludeProductCodes]);

  const handleSelectChange = (selectedRowKeys: React.Key[], selectedRows: ProductDto[]) => {
    const newMap = new Map(selectedMap);
    
    // First, remove any unselected items FROM THE CURRENT PAGE
    const currentPageKeys = displayProducts.map(p => p.code!);
    currentPageKeys.forEach(key => {
      if (!selectedRowKeys.includes(key)) {
        newMap.delete(key);
      }
    });

    // Then, add newly selected items
    selectedRows.forEach(row => {
      if (row.code && !newMap.has(row.code)) {
        newMap.set(row.code, {
          ...row,
          orderUnitPrice: row.unitPrice || 0,
          orderQuantity: 1
        });
      }
    });

    setSelectedMap(newMap);
  };

  const handlePriceChange = (code: string, val: number | null) => {
    const newMap = new Map(selectedMap);
    const item = newMap.get(code);
    if (item) {
      newMap.set(code, { ...item, orderUnitPrice: val || 0 });
      setSelectedMap(newMap);
    }
  };

  const handleQuantityChange = (code: string, val: number | null) => {
    const newMap = new Map(selectedMap);
    const item = newMap.get(code);
    if (item) {
      newMap.set(code, { ...item, orderQuantity: val || 1 });
      setSelectedMap(newMap);
    }
  };

  const columns = [
    { title: '產品代碼', dataIndex: 'code', key: 'code', width: 120, align: 'left' as const },
    { title: '產品名稱', dataIndex: 'name', key: 'name', width: 200, ellipsis: true, align: 'left' as const },
    { title: '客戶產品代碼', dataIndex: 'customerProductId', key: 'customerProductId', width: 140, align: 'left' as const },
    {
      title: '單價',
      key: 'orderUnitPrice',
      width: 140,
      align: 'right' as const,
      render: (_: any, record: ProductDto) => {
        const isSelected = selectedMap.has(record.code!);
        const currentPrice = isSelected ? selectedMap.get(record.code!)!.orderUnitPrice : (record.unitPrice || 0);
        return (
          <InputNumber
            min={0}
            precision={2}
            formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={(value) => value!.replace(/\$\s?|(,*)/g, '') as unknown as number}
            value={currentPrice}
            disabled={!isSelected}
            onChange={(val) => handlePriceChange(record.code!, val)}
            size="small"
            style={{ width: '100%' }}
          />
        );
      }
    },
    {
      title: '數量',
      key: 'orderQuantity',
      width: 120,
      align: 'right' as const,
      render: (_: any, record: ProductDto) => {
        const isSelected = selectedMap.has(record.code!);
        const currentQty = isSelected ? selectedMap.get(record.code!)!.orderQuantity : 1;
        return (
          <InputNumber
            min={1}
            formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={(value) => value!.replace(/\$\s?|(,*)/g, '') as unknown as number}
            value={currentQty}
            disabled={!isSelected}
            onChange={(val) => handleQuantityChange(record.code!, val)}
            size="small"
            style={{ width: '100%' }}
          />
        );
      }
    },
    {
      title: '類型',
      dataIndex: 'type',
      key: 'type',
      width: 140,
      align: 'center' as const,
      render: (val: string) => val ? <Tag color="blue"><DictLabel dictKey="PRODUCT_TYPE" value={val} /></Tag> : '-'
    },
    { title: '單位', dataIndex: 'unit', key: 'unit', width: 80, align: 'center' as const },
  ];

  const handleClearSelection = () => {
    setSelectedMap(new Map());
  };

  return (
    <Modal
      title={`挑選客戶產品 - ${customerCode}`}
      open={open}
      onCancel={onCancel}
      width="80vw"
      centered
      styles={{ body: { height: 'calc(80vh - 110px)', overflow: 'hidden', display: 'flex', flexDirection: 'column' } }}
      maskClosable={false}
      footer={null}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexShrink: 0 }}>
        <Space>
          <Input.Search
            placeholder="搜尋產品名稱或編號"
            allowClear
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
            onClick={() => onConfirm(Array.from(selectedMap.values()))}
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
          scroll={{ x: 'max-content', y: 'calc(80vh - 220px)' }}
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
