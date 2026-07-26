// @ts-nocheck
import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Controller } from 'react-hook-form';
import { Form, Input, Select, DatePicker, Button, Space, Tag, Row, Col, App } from 'antd';
import { PageCard } from '@/components/common/PageCard';
import { SearchOutlined, ClearOutlined, DownOutlined, UpOutlined, CopyOutlined } from '@ant-design/icons';
import { DictSelect } from '@/components/Form/DictSelect';
import { useQuery } from '@tanstack/react-query';
import { getApiV1StorageTransactions } from '@/api/generated/sdk.gen';
import type { InventoryTransactionDto } from '@/api/generated/types.gen';
import dayjs from 'dayjs';
import { EllipsisText } from '@/components/Table/EllipsisText';
import { useErpListQuery } from '@/hooks/useErpListQuery';
import ActiveQueryAndSortTags from '@/components/Table/ActiveQueryAndSortTags';
import StandardErpTable from '@/components/Table/StandardErpTable';
import type { SearchFieldConfig } from '@/components/Form/types';

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

const searchConfig: SearchFieldConfig[] = [
  { name: 'inventoryCode', label: '庫存物料編號', componentType: 'Input' },
  { name: 'storageCode', label: '儲位', componentType: 'DictSelect' },
  { name: 'docType', label: '單據類型', componentType: 'Select', componentProps: { options: docTypeOptions } },
  { name: 'sourceDocCode', label: '來源單據編號', componentType: 'Input' },
  { name: 'movementDateRange', label: '異動日期區間', componentType: 'DateRangePicker' },
  { name: 'transactionDateRange', label: '交易時間區間', componentType: 'DateRangePicker' },
];

export default function StorageTransactionsList() {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [expandForm, setExpandForm] = useState(false);

  const [searchParams] = useSearchParams();
  const initialStorageCode = searchParams.get('storageCode') || undefined;
  const initialInventoryCode = searchParams.get('inventoryCode') || undefined;

  const [params, setParams] = useState<any>({
    pageNumber: 1,
    pageSize: 20,
    storageCode: initialStorageCode,
    inventoryCode: initialInventoryCode
  });

  const customSetParams = (newParams: any) => {
    setParams((prev: any) => {
      const next = { ...prev, ...newParams };
      
      // Convert movementDateRange to dayjs objects if they are strings
      if (next.movementDateRange) {
        let range = next.movementDateRange;
        if (typeof range === 'string') {
          range = range.split(',');
        }
        if (Array.isArray(range) && range.length === 2) {
          const start = range[0];
          const end = range[1];
          if (start && end) {
            next.movementDateRange = [
              dayjs.isDayjs(start) ? start : dayjs(start),
              dayjs.isDayjs(end) ? end : dayjs(end)
            ];
          }
        }
      }

      // Convert transactionDateRange to dayjs objects if they are strings
      if (next.transactionDateRange) {
        let range = next.transactionDateRange;
        if (typeof range === 'string') {
          range = range.split(',');
        }
        if (Array.isArray(range) && range.length === 2) {
          const start = range[0];
          const end = range[1];
          if (start && end) {
            next.transactionDateRange = [
              dayjs.isDayjs(start) ? start : dayjs(start),
              dayjs.isDayjs(end) ? end : dayjs(end)
            ];
          }
        }
      }

      return next;
    });
  };

  const listQuery = useErpListQuery({
    params,
    setParams: customSetParams
  });

  const { searchForm } = listQuery;
  const { control, handleSubmit } = searchForm;

  useEffect(() => {
    searchForm.reset(params);
  }, [params]);

  const { data, isFetching } = useQuery({
    queryKey: ['storage-transactions', params],
    queryFn: async () => {
      // transform date ranges to string arrays if they exist
      const movementDateRange = params.movementDateRange 
        ? [
            dayjs.isDayjs(params.movementDateRange[0]) ? params.movementDateRange[0].format('YYYY-MM-DD') : dayjs(params.movementDateRange[0]).format('YYYY-MM-DD'),
            dayjs.isDayjs(params.movementDateRange[1]) ? params.movementDateRange[1].format('YYYY-MM-DD') : dayjs(params.movementDateRange[1]).format('YYYY-MM-DD')
          ] 
        : undefined;
      
      const transactionDateRange = params.transactionDateRange 
        ? [
            dayjs.isDayjs(params.transactionDateRange[0]) ? params.transactionDateRange[0].format('YYYY-MM-DDTHH:mm:ss') : dayjs(params.transactionDateRange[0]).format('YYYY-MM-DDTHH:mm:ss'),
            dayjs.isDayjs(params.transactionDateRange[1]) ? params.transactionDateRange[1].format('YYYY-MM-DDTHH:mm:ss') : dayjs(params.transactionDateRange[1]).format('YYYY-MM-DDTHH:mm:ss')
          ] 
        : undefined;

      const res = await getApiV1StorageTransactions({
        query: {
          InventoryCode: params.inventoryCode,
          StorageCode: params.storageCode,
          DocType: params.docType,
          SourceDocCode: params.sourceDocCode,
          MovementDateRange: movementDateRange,
          TransactionDateRange: transactionDateRange,
          pageNumber: params.pageNumber,
          pageSize: params.pageSize,
        }
      });
      
      return res.data;
    }
  });

  const listData = data?.data?.data || [];
  const totalRecords = data?.data?.totalRecords || 0;

  const handleTableChange = (newPagination: any) => {
    customSetParams({
      pageNumber: newPagination.current || 1,
      pageSize: newPagination.pageSize || 20
    });
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
    <div className="p-4 pb-0 flex flex-col" style={{ height: 'calc(100vh - 64px)' }}>
      <PageCard 
        title="產品庫存異動明細"
      >
        <Form 
          layout="vertical"
          className="ant-advanced-search-form mb-4 pb-4 border-b border-[#f0f0f0]"
          style={{ flexShrink: 0 }}
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
                  <Button onClick={listQuery.handleClear} icon={<ClearOutlined />}>
                    清除
                  </Button>
                  <Button type="primary" onClick={handleSubmit(listQuery.handleSearch)} icon={<SearchOutlined />}>
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

        <ActiveQueryAndSortTags
          searchConfig={searchConfig}
          tableColumns={columns}
          params={params}
          onQueryTagClose={listQuery.handleClearQueryField}
          onSortTagClose={listQuery.handleClearSortField}
          onClearSort={listQuery.handleClearAllSort}
        />

        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <StandardErpTable
            rowKey={(record: InventoryTransactionDto) => `${record.transactionId}_${record.createdAt}`}
            selectedRowKey="id"
            dataSource={listData}
            columns={columns}
            loading={isFetching}
            pagination={{
              current: params.pageNumber,
              pageSize: params.pageSize,
              total: totalRecords,
            }}
            onChange={handleTableChange}
          />
        </div>
      </PageCard>
    </div>
  );
}
