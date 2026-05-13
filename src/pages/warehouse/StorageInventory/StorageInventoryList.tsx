import { useMemo, useState, useEffect } from 'react';
import { Card, Table, Tabs, Button, Space, Form, Input, Select, ConfigProvider } from 'antd';
import { useForm, Controller } from 'react-hook-form';
import { SearchOutlined, ClearOutlined, SyncOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { getApiV1StorageInventory } from '@/api/generated/sdk.gen';
import { useThemeStore } from '@/stores/useThemeStore';
import { useNavigate, useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';

import { inventoryTypeOptions } from './StorageInventoryConfig';
import { EllipsisText } from '@/components/Table/EllipsisText';
import { DictSelect } from '@/components/Form/DictSelect';

const { TabPane } = Tabs;

export default function StorageInventoryList() {
  const { mode } = useThemeStore();
  const searchForm = useForm();
  const { control, handleSubmit, reset } = searchForm;
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [queryParams, setQueryParams] = useState({
    StorageCode: searchParams.get('storageCode') || undefined,
    InventoryCode: searchParams.get('inventoryCode') || undefined,
    Type: searchParams.get('type') || undefined,
  });

  const [activeTab, setActiveTab] = useState<string>('1');

  // Add states for expanded rows
  const [expandedInventoryKeys, setExpandedInventoryKeys] = useState<readonly React.Key[]>([]);
  const [expandedStorageKeys, setExpandedStorageKeys] = useState<readonly React.Key[]>([]);

  useEffect(() => {
    const newStorageCode = searchParams.get('storageCode') || undefined;
    const newInventoryCode = searchParams.get('inventoryCode') || undefined;
    const newType = searchParams.get('type') || undefined;

    if (newStorageCode) {
      setActiveTab('2');
      setExpandedStorageKeys([newStorageCode]);
      setExpandedInventoryKeys([]);
    } else {
      setActiveTab('1');
      if (newInventoryCode) {
        setExpandedInventoryKeys([newInventoryCode]);
        setExpandedStorageKeys([]);
      }
    }

    setQueryParams(prev => {
      if (prev.StorageCode !== newStorageCode || prev.InventoryCode !== newInventoryCode || prev.Type !== newType) {
        return {
          StorageCode: newStorageCode,
          InventoryCode: newInventoryCode,
          Type: newType,
        };
      }
      return prev;
    });

    reset({
      StorageCode: newStorageCode,
      InventoryCode: newInventoryCode,
      Type: newType,
    });
  }, [searchParams, reset]);

  const { data, isFetching, refetch } = useQuery({
    queryKey: ['storage-inventory', queryParams],
    queryFn: async () => {
      const res = await getApiV1StorageInventory({
        query: {
          ...queryParams
        }
      });
      
      const payload = res.data?.data;
      // 處理新型態：直接是陣列
      if (Array.isArray(payload)) {
        return payload;
      }
      // 相容舊型態：PagedResult { data: [], totalRecords: ... }
      if (payload && Array.isArray((payload as any).data)) {
        return (payload as any).data;
      }
      return [];
    }
  });

  // Grouping logic
  const inventoryGroups = useMemo(() => {
    const map = new Map();
    (data || []).forEach((item: any) => {
      const key = item.inventoryCode || '';
      if (!map.has(key)) {
        map.set(key, {
          inventoryCode: key,
          inventoryName: item.inventoryName || '',
          type: item.type || '',
          totalQuantity: 0,
          storageCount: 0,
          items: [],
        });
      }
      const group = map.get(key);
      group.totalQuantity += (item.quantity || 0);
      group.storageCount += 1;
      group.items.push(item);
    });
    return Array.from(map.values());
  }, [data]);

  const storageGroups = useMemo(() => {
    const map = new Map();
    (data || []).forEach((item: any) => {
      const key = item.storageCode || '';
      if (!map.has(key)) {
        map.set(key, {
          storageCode: key,
          storageName: item.storageName || '',
          storageType: item.storageType || '',
          totalQuantity: 0,
          inventoryCount: 0,
          items: [],
        });
      }
      const group = map.get(key);
      group.totalQuantity += (item.quantity || 0);
      group.inventoryCount += 1;
      group.items.push(item);
    });
    return Array.from(map.values());
  }, [data]);

  const handleSearch = () => {
    setQueryParams(searchForm.getValues() as any);
  };

  const handleReset = () => {
    reset();
    setQueryParams({ StorageCode: undefined, InventoryCode: undefined, Type: undefined });
  };

  const renderQuantity = (val: number, record: any) => {
    if (val === 0 || !val) return <span className="text-gray-400 font-medium">-</span>;
    
    // Quantity > 0
    const color = mode === 'dark' ? '#4ade80' : '#16a34a'; // Bright green for dark, normal green for light
    return (
      <Button 
        type="link" 
        className="p-0 font-semibold" style={{color, textDecoration: 'underline' }}
        onClick={() => navigate(`/warehouse/inventory-movements?storageCode=${record.storageCode}&inventoryCode=${record.inventoryCode}`)}
      >
        {val.toLocaleString('zh-TW')}
      </Button>
    );
  };

  // Shared Sub Columns
  const subColumnsForInventory = [
    { title: '儲位類別', dataIndex: 'storageType', align: 'center', width: 100 },
    { title: '儲位編號', dataIndex: 'storageCode', width: 200 },
    { title: '儲位名稱', dataIndex: 'storageName', render: (val: string) => <EllipsisText text={val} /> },
    { title: '庫存量', dataIndex: 'quantity', align: 'right', width: 120, render: renderQuantity },
    { title: '最後更新時間', dataIndex: 'updatedAt', width: 180, render: (val: string) => val ? dayjs(val).format('YYYY/MM/DD HH:mm:ss') : '-' },
  ];

  const subColumnsForStorage = [
    { title: '庫存類型', dataIndex: 'type', align: 'center', width: 100, render: (val: string) => inventoryTypeOptions.find(o => o.value === val)?.label || '-' },
    { title: '物料編號', dataIndex: 'inventoryCode', width: 150 },
    { title: '物料名稱', dataIndex: 'inventoryName', render: (val: string) => <EllipsisText text={val} /> },
    { title: '庫存量', dataIndex: 'quantity', align: 'right', width: 120, render: renderQuantity },
    { title: '最後更新時間', dataIndex: 'updatedAt', width: 180, render: (val: string) => val ? dayjs(val).format('YYYY/MM/DD HH:mm:ss') : '-' },
  ];

  // Master Columns
  const inventoryMasterColumns = [
    { title: '庫存類型', dataIndex: 'type', align: 'center', width: 100, render: (val: string) => inventoryTypeOptions.find(o => o.value === val)?.label || '-' },
    { title: '物料編號', dataIndex: 'inventoryCode', width: 250 },
    { title: '物料名稱', dataIndex: 'inventoryName', render: (val: string) => <EllipsisText text={val} /> },
    { title: '總庫存量', dataIndex: 'totalQuantity', align: 'right', width: 120, render: (val: number) => val.toLocaleString('zh-TW') },
    { title: '儲位數', dataIndex: 'storageCount', align: 'right', width: 100 },
  ];

  const storageMasterColumns = [
    { title: '儲位類別', dataIndex: 'storageType', align: 'center', width: 100 },
    { title: '儲位編號', dataIndex: 'storageCode', width: 200 },
    { title: '儲位名稱', dataIndex: 'storageName', render: (val: string) => <EllipsisText text={val} /> },
    { title: '總庫存量', dataIndex: 'totalQuantity', align: 'right', width: 120, render: (val: number) => val.toLocaleString('zh-TW') },
    { title: '物料數', dataIndex: 'inventoryCount', align: 'right', width: 100 },
  ];

  return (
    <div className="p-4">
      <Card
        title={
          <div className="flex items-center gap-3">
            <div style={{ width: '4px', height: '24px', backgroundColor: '#1677ff', borderRadius: '2px' }} />
            <div className="m-0 font-semibold" style={{fontSize: '20px'}}>
              產品儲位庫存
            </div>
          </div>
        }
        extra={
          <Button icon={<SyncOutlined />} onClick={() => refetch()} loading={isFetching}>
            更新資料
          </Button>
        }
      >
        <Form layout="inline" className="mb-4" onFinish={handleSubmit(handleSearch)}>
          <Form.Item label="儲位">
            <Controller name="StorageCode" control={control} render={({field}: any) => <DictSelect {...field} dictKey="STORAGE" placeholder="請選擇儲位" style={{ width: 220 }} allowClear />} />
          </Form.Item>
          <Form.Item label="物料編號">
            <Controller name="InventoryCode" control={control} render={({field}: any) => <Input {...field} placeholder="請輸入物料編號" allowClear style={{ width: 220 }} />} />
          </Form.Item>
          <Form.Item label="庫存類型">
            <Controller name="Type" control={control} render={({field}: any) => <Select {...field} placeholder="請選擇類型" allowClear style={{ width: 120 }} options={inventoryTypeOptions} />} />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<SearchOutlined />} loading={isFetching}>查詢</Button>
              <Button onClick={handleReset} icon={<ClearOutlined />}>清除</Button>
            </Space>
          </Form.Item>
        </Form>

        <Tabs activeKey={activeTab} onChange={(key) => setActiveTab(key)}>
          <TabPane tab="依物料分組" key="1">
            <Table
              rowKey="inventoryCode"
              loading={isFetching}
              dataSource={inventoryGroups}
              columns={inventoryMasterColumns as any}
              expandable={{
                expandedRowKeys: expandedInventoryKeys,
                onExpandedRowsChange: setExpandedInventoryKeys,
                expandedRowRender: (record) => (
                  <ConfigProvider
                    theme={{
                      components: {
                        Table: {
                          colorBgContainer: mode === 'dark' ? '#1a1a1a' : '#f8fafc',
                          headerBg: mode === 'dark' ? '#262626' : '#e2e8f0',
                          headerColor: mode === 'dark' ? '#d4d4d4' : '#475569',
                          borderColor: mode === 'dark' ? '#303030' : '#cbd5e1',
                        },
                      },
                    }}
                  >
                    <div className={`mx-4 my-2 p-4 rounded-lg border-l-4 ${mode === 'dark' ? 'bg-[#1a1a1a] border-blue-600 shadow-inner' : 'bg-slate-50 border-blue-500 shadow-sm'}`}>
                      <div className="mb-3 text-sm font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block"></span>
                        物料 ({record.inventoryCode}) 於各儲位分布明細
                      </div>
                      <Table
                        rowKey={(r) => r.storageCode + r.updatedAt}
                        columns={subColumnsForInventory as any}
                        dataSource={record.items}
                        pagination={false}
                        size="small"
                        bordered
                       scroll={{ x: 'max-content' }} />
                    </div>
                  </ConfigProvider>
                ),
              }}
              pagination={false}
             scroll={{ x: 'max-content' }} />
          </TabPane>
          <TabPane tab="依儲位分組" key="2">
            <Table
              rowKey="storageCode"
              loading={isFetching}
              dataSource={storageGroups}
              columns={storageMasterColumns as any}
              expandable={{
                expandedRowKeys: expandedStorageKeys,
                onExpandedRowsChange: setExpandedStorageKeys,
                expandedRowRender: (record) => (
                  <ConfigProvider
                    theme={{
                      components: {
                        Table: {
                          colorBgContainer: mode === 'dark' ? '#1a1a1a' : '#f0fdf4',
                          headerBg: mode === 'dark' ? '#262626' : '#dcfce7',
                          headerColor: mode === 'dark' ? '#d4d4d4' : '#166534',
                          borderColor: mode === 'dark' ? '#303030' : '#bbf7d0',
                        },
                      },
                    }}
                  >
                    <div className={`mx-4 my-2 p-4 rounded-lg border-l-4 ${mode === 'dark' ? 'bg-[#1a1a1a] border-green-600 shadow-inner' : 'bg-green-50 border-green-500 shadow-sm'}`}>
                      <div className="mb-3 text-sm font-bold text-green-700 dark:text-green-400 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block"></span>
                        儲位 ({record.storageCode}) 之物料庫存明細
                      </div>
                      <Table
                        rowKey={(r) => r.inventoryCode + r.updatedAt}
                        columns={subColumnsForStorage as any}
                        dataSource={record.items}
                        pagination={false}
                        size="small"
                        bordered
                       scroll={{ x: 'max-content' }} />
                    </div>
                  </ConfigProvider>
                ),
              }}
              pagination={false}
             scroll={{ x: 'max-content' }} />
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
}
