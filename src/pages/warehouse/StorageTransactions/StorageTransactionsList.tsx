import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { Card, Table, Form, Input, Select, DatePicker, Button, Space, Tag, Row, Col, App } from 'antd';
import { SearchOutlined, ClearOutlined, DownOutlined, UpOutlined, CopyOutlined } from '@ant-design/icons';
import { DictSelect } from '@/components/Form/DictSelect';
import { useQuery } from '@tanstack/react-query';
import { getApiV1StorageTransactions } from '@/api/generated/sdk.gen';
import type { InventoryTransactionDto } from '@/api/generated/types.gen';
import dayjs from 'dayjs';
import { EllipsisText } from '@/components/Table/EllipsisText';

const { RangePicker } = DatePicker;

const docTypeOptions = [
  { label: '製令入庫', value: 'PR' },
  { label: 'QC 檢驗', value: 'QC' },
  { label: '銷售單', value: 'SA' },
  { label: '盤點', value: 'IV' },
  { label: '庫存調整單', value: 'AD' },
];

const subTypeOptions = [
  { label: '庫存調整', value: 'IA' },
  { label: '訂單銷售', value: 'OD' },
];

export default function StorageTransactionsList() {

  const searchForm = useForm();
  const { control, handleSubmit, reset } = searchForm;
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [expandForm, setExpandForm] = useState(false);

  const [searchParams] = useSearchParams();
  const initialStorageCode = searchParams.get('storageCode') || undefined;
  const initialInventoryCode = searchParams.get('inventoryCode') || undefined;

  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  });

  const [queryParams, setQueryParams] = useState<any>({
    storageCode: initialStorageCode,
    inventoryCode: initialInventoryCode
  });

  useEffect(() => {
    reset({
      storageCode: initialStorageCode,
      inventoryCode: initialInventoryCode
    });
  }, [reset, initialStorageCode, initialInventoryCode]);

  const { data, isFetching } = useQuery({
    queryKey: ['storage-transactions', queryParams, pagination.current, pagination.pageSize],
    queryFn: async () => {
      // transform date ranges to string arrays if they exist
      const movementDateRange = queryParams.movementDateRange 
        ? [queryParams.movementDateRange[0].format('YYYY-MM-DD'), queryParams.movementDateRange[1].format('YYYY-MM-DD')] 
        : undefined;
      
      const transactionDateRange = queryParams.transactionDateRange 
        ? [queryParams.transactionDateRange[0].format('YYYY-MM-DDTHH:mm:ss'), queryParams.transactionDateRange[1].format('YYYY-MM-DDTHH:mm:ss')] 
        : undefined;

      const res = await getApiV1StorageTransactions({
        query: {
          InventoryCode: queryParams.inventoryCode,
          StorageCode: queryParams.storageCode,
          DocType: queryParams.docType,
          SourceDocCode: queryParams.sourceDocCode,
          MovementDateRange: movementDateRange,
          TransactionDateRange: transactionDateRange,
          pageNumber: pagination.current,
          pageSize: pagination.pageSize,
        }
      });
      
      return res.data;
    }
  });

  const listData = data?.data?.data || [];
  const totalRecords = data?.data?.totalRecords || 0;

  const handleSearch = () => {
    setQueryParams(searchForm.getValues());
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleReset = () => {
    reset();
    setQueryParams({});
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleTableChange = (newPagination: any) => {
    setPagination(prev => ({
      ...prev,
      current: newPagination.current || 1,
      pageSize: newPagination.pageSize || 20
    }));
  };

  const columns: any[] = [
    {
      title: '異動日期',
      dataIndex: 'movementDate',
      width: 110,
      fixed: 'left',
      align: 'center',
      render: (val: string) => val ? dayjs(val).format('YYYY-MM-DD') : '-'
    },
    {
      title: '儲位編號',
      dataIndex: 'storageCode',
      width: 160,
      fixed: 'left',
      render: (val: string) => val ? (
        <div className="flex items-center gap-2">
          <CopyOutlined 
            className="text-gray-400 hover:text-blue-500 cursor-pointer" 
            onClick={() => {
              navigator.clipboard.writeText(val);
              message.success('已複製儲位編號');
            }} 
          />
          <a onClick={() => navigate(`/warehouse/inventory?storageCode=${encodeURIComponent(val)}`)} className="font-semibold">
            {val}
          </a>
        </div>
      ) : '-'
    },
    {
      title: '庫存物料編號',
      dataIndex: 'inventoryCode',
      width: 170,
      fixed: 'left',
      render: (val: string) => val ? (
        <div className="flex items-center gap-2">
          <CopyOutlined 
            className="text-gray-400 hover:text-blue-500 cursor-pointer" 
            onClick={() => {
              navigator.clipboard.writeText(val);
              message.success('已複製物料編號');
            }} 
          />
          <a onClick={() => navigate(`/warehouse/inventory?inventoryCode=${encodeURIComponent(val)}`)} className="font-semibold text-blue-600 dark:text-blue-400">
            {val}
          </a>
        </div>
      ) : '-'
    },
    {
      title: '物料名稱',
      dataIndex: 'inventoryName',
      width: 160,
      render: (val: string) => <EllipsisText text={val} />
    },
    {
      title: '儲位名稱',
      dataIndex: 'storageName',
      width: 120,
      render: (val: string) => <EllipsisText text={val} />
    },
    {
      title: '異動時間',
      dataIndex: 'transactionDate',
      width: 170,
      align: 'center',
      render: (val: string) => val ? dayjs(val).format('YYYY/MM/DD HH:mm:ss') : '-'
    },
    {
      title: '異動類別',
      dataIndex: 'signFlag',
      width: 100,
      align: 'center',
      render: (val: number) => {
        if (val === 1) return <Tag color="success" className="m-0">入庫</Tag>;
        if (val === -1) return <Tag color="warning" className="m-0">出庫</Tag>;
        return <Tag color="error" className="m-0">異常</Tag>;
      }
    },
    {
      title: '異動數量',
      dataIndex: 'quantity',
      width: 110,
      align: 'right',
      render: (val: number) => (
        <span className="font-medium">
          {val !== undefined && val !== null ? val.toLocaleString('zh-TW') : '-'}
        </span>
      )
    },
    {
      title: '單據類型',
      dataIndex: 'docType',
      width: 110,
      align: 'center',
      render: (val: string) => {
        const opt = docTypeOptions.find(o => o.value === val);
        return opt ? <Tag color="processing">{opt.label}</Tag> : (val || '-');
      }
    },
    {
      title: '單據次類型',
      dataIndex: 'subType',
      width: 110,
      align: 'center',
      render: (val: string) => {
        const opt = subTypeOptions.find(o => o.value === val);
        return opt ? opt.label : (val || '-');
      }
    },
    {
      title: '來源單據編號',
      dataIndex: 'sourceDocCode',
      width: 180,
      render: (val: string) => val ? (
        <div className="flex items-center gap-2">
          <CopyOutlined 
            className="text-gray-400 hover:text-blue-500 cursor-pointer flex-shrink-0" 
            onClick={() => {
              navigator.clipboard.writeText(val);
              message.success('已複製來源單據編號');
            }} 
          />
          <EllipsisText text={val} />
        </div>
      ) : '-'
    },
    {
      title: '備註',
      dataIndex: 'notes',
      width: 200,
      render: (val: string) => <EllipsisText text={val} />
    },
    {
      title: '建立時間',
      dataIndex: 'createdAt',
      width: 170,
      align: 'center',
      render: (val: string) => val ? dayjs(val).format('YYYY/MM/DD HH:mm:ss') : '-'
    },
    {
      title: '建立人員',
      dataIndex: 'createdBy',
      width: 120,
      render: (val: string) => <EllipsisText text={val} />
    }
  ];

  return (
    <div  style={{ padding: '16px 16px 0px 16px', height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
      <Card variant="borderless" className="shadow-sm" style={{ flexShrink: 0 }}
        title={
          <div className="flex items-center gap-3">
            <div style={{ width: '4px', height: '24px', backgroundColor: '#1677ff', borderRadius: '2px' }} />
            <div className="m-0 font-semibold" style={{fontSize: '20px'}}>
              庫存異動明細
            </div>
          </div>
        }>
        <Form 
          
          layout="vertical"
          className="ant-advanced-search-form"
        >
          <Row gutter={16}>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Form.Item label="庫存物料編號">
                <Controller name="inventoryCode" control={control} render={({field}) => <Input {...field} placeholder="請輸入庫存物料編號" allowClear />} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Form.Item label="儲位">
                <Controller name="storageCode" control={control} render={({field}) => <DictSelect {...field} dictKey="STORAGE" placeholder="請選擇儲位" allowClear />} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Form.Item label="單據類型">
                <Controller name="docType" control={control} render={({field}) => <Select {...field} placeholder="請選擇單據類型" options={docTypeOptions} allowClear />} />
              </Form.Item>
            </Col>
            {expandForm && (
              <>
                <Col xs={24} sm={12} md={8} lg={6}>
                  <Form.Item label="來源單據編號">
                    <Controller name="sourceDocCode" control={control} render={({field}) => <Input {...field} placeholder="請輸入來源單據編號" allowClear />} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8} lg={6}>
                  <Form.Item label="異動日期區間">
                    <Controller name="movementDateRange" control={control} render={({field}) => <RangePicker {...field} className="w-full" />} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8} lg={6}>
                  <Form.Item label="交易時間區間">
                    <Controller name="transactionDateRange" control={control} render={({field}) => <RangePicker {...field} showTime className="w-full" />} />
                  </Form.Item>
                </Col>
              </>
            )}
            <Col flex="auto" className="flex items-end justify-end">
              <Form.Item className="mb-0">
                <Space>
                  <Button onClick={handleReset} icon={<ClearOutlined />}>
                    清除
                  </Button>
                  <Button type="primary" onClick={handleSubmit(handleSearch)} icon={<SearchOutlined />}>
                    查詢
                  </Button>
                  <a 
                    className="text-sm ml-2 flex items-center gap-1 select-none"
                    onClick={() => setExpandForm(!expandForm)}
                  >
                    {expandForm ? '收起' : '展開'}
                    {expandForm ? <UpOutlined /> : <DownOutlined />}
                  </a>
                </Space>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>

      <Card 
        variant="borderless" 
        className="shadow-sm flex flex-col" 
        style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        styles={{ 
          body: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 } 
        }}
      >
        <style>{`
          .ant-table-wrapper { height: 100%; display: flex; flex-direction: column; }
          .ant-spin-nested-loading { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
          .ant-spin { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
          .ant-spin-container { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
          .ant-table { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
          .ant-table-container { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
          .ant-table-body { flex: 1; overflow-y: auto !important; max-height: none !important; }
          .ant-table-pagination { margin-top: auto !important; margin-bottom: 16px !important; padding-right: 16px !important; padding-left: 16px !important; }
        `}</style>
        <Table
          rowKey={(record: InventoryTransactionDto) => `${record.transactionId}_${record.createdAt}`}
          dataSource={listData}
          columns={columns}
          loading={isFetching}
          scroll={{ x: 'max-content', y: 300 }}
          size="middle"
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: totalRecords,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 筆`,
            pageSizeOptions: ['10', '20', '50', '100']
          }}
          onChange={handleTableChange}
        />
      </Card>
    </div>
  );
}
