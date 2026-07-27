import { useState, useEffect } from 'react';
import { Modal, Table, Input, Space, Button } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { getApiV1Material } from '@/api/generated';
import type { MaterialDto } from '@/api/generated/types.gen';
import { DEFAULT_PAGE_SIZE } from '@/constants';
import { MODAL_WIDTH_PICK, MODAL_PICK_BODY_MAX_HEIGHT } from '@/constants/ui';
import { EllipsisText } from '@/components/Table/EllipsisText';

interface CustomerMaterialPickerModalProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: (selectedMaterials: MaterialDto[]) => void;
  customerCode: string;
  customerName?: string;
  excludeMaterialCodes?: string[];
}

export default function CustomerMaterialPickerModal({
  open,
  onCancel,
  onConfirm,
  customerCode,
  customerName = '',
  excludeMaterialCodes = [],
}: CustomerMaterialPickerModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [selectedRows, setSelectedRowData] = useState<MaterialDto[]>([]);

  // Reset local state when modal opens
  useEffect(() => {
    if (open) {
      setSearchTerm('');
      setPage(1);
      setSelectedRowKeys([]);
      setSelectedRowData([]);
    }
  }, [open]);

  // Query raw materials from backend locked onto the specific CustomerCode and IsCustomerSupplied === true
  const { data: response, isLoading, isFetching } = useQuery({
    queryKey: ['picker-customer-materials', customerCode, searchTerm, page, pageSize, excludeMaterialCodes],
    queryFn: () => getApiV1Material({
      query: {
        pageNumber: page,
        pageSize: pageSize,
        IsActive: true,
        IsCustomerSupplied: true,
        CustomerCode: customerCode,
        CodeOrName: searchTerm || undefined,
      } as any
    }),
    enabled: open && !!customerCode,
  });

  const list: MaterialDto[] = (response?.data as any)?.data?.data || (response?.data as any)?.data || [];
  const total = (response?.data as any)?.data?.totalRecords || (response?.data as any)?.totalRecords || 0;

  // Filter out any materials that are already in the receipt detail list
  const filteredList = list.filter(item => item.code && !excludeMaterialCodes.includes(item.code!));

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setPage(1);
  };

  const handleConfirm = () => {
    onConfirm(selectedRows);
  };

  const handleTableChange = (pagination: any) => {
    setPage(pagination.current || 1);
    setPageSize(pagination.pageSize || DEFAULT_PAGE_SIZE);
  };

  const columns = [
    {
      title: '原料編碼',
      dataIndex: 'code',
      width: 180,
    },
    {
      title: '原料名稱',
      dataIndex: 'name',
      width: 220,
      render: (val: string) => <EllipsisText text={val || '-'} maxWidth={200} />,
    },
    {
      title: '型態',
      dataIndex: 'materialForm',
      width: 90,
      align: 'center' as const,
      render: (v: string) => (v === 'R' ? '捲料' : '片料'),
    },
    {
      title: '廠牌',
      dataIndex: 'brand',
      width: 110,
    },
    {
      title: '型號',
      dataIndex: 'modelNo',
      width: 110,
    },
    {
      title: '厚度(mm)',
      dataIndex: 'thickness',
      width: 100,
      align: 'right' as const,
      render: (val: number) => Number(val || 0).toFixed(4),
    },
  ];

  return (
    <Modal
      title={`選擇客供料原物料 (鎖定客戶: [${customerCode}] ${customerName})`}
      width={MODAL_WIDTH_PICK}
      open={open}
      onCancel={onCancel}
      destroyOnHidden
      centered
      styles={{
        body: {
          maxHeight: MODAL_PICK_BODY_MAX_HEIGHT,
          overflowY: 'auto',
          padding: '16px 24px 0 24px',
        },
      }}
      footer={
        <Space>
          <Button onClick={onCancel}>
            取消
          </Button>
          <Button
            type="primary"
            disabled={selectedRowKeys.length === 0}
            onClick={handleConfirm}
          >
            確定選擇 ({selectedRowKeys.length})
          </Button>
        </Space>
      }
    >
      <Space orientation="vertical" style={{ width: '100%' }} size="middle">
        <Input.Search
          placeholder="請輸入原料編碼或品名搜尋..."
          enterButton="搜尋"
          allowClear
          onSearch={handleSearch}
          loading={isFetching}
          style={{ width: '100%' }}
        />

        <Table
          dataSource={filteredList}
          columns={columns}
          rowKey="code"
          loading={isLoading}
          size="medium"
          bordered
          pagination={{
            current: page,
            pageSize: pageSize,
            total,
            showSizeChanger: true,
            showTotal: (t) => `共 ${t} 筆客供原物料`,
          }}
          onChange={handleTableChange}
          rowSelection={{
            type: 'checkbox',
            selectedRowKeys,
            onChange: (keys, rows) => {
              setSelectedRowKeys(keys);
              setSelectedRowData(rows);
            },
          }}
        />
      </Space>
    </Modal>
  );
}
