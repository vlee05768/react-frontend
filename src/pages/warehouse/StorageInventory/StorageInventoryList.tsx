import { useMemo, useState, useEffect } from 'react';
import { Card, Table, Tabs, Button, Space, Form, Input, Select } from 'antd';
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
  const [form] = Form.useForm();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [queryParams, setQueryParams] = useState({
    StorageCode: searchParams.get('storageCode') || undefined,
    InventoryCode: searchParams.get('inventoryCode') || undefined,
    Type: searchParams.get('type') || undefined,
  });

  useEffect(() => {
    const newStorageCode = searchParams.get('storageCode') || undefined;
    const newInventoryCode = searchParams.get('inventoryCode') || undefined;
    const newType = searchParams.get('type') || undefined;

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

    form.setFieldsValue({
      StorageCode: newStorageCode,
      InventoryCode: newInventoryCode,
      Type: newType,
    });
  }, [searchParams, form]);

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
    setQueryParams(form.getFieldsValue());
  };

  const handleReset = () => {
    form.resetFields();
    setQueryParams({ StorageCode: undefined, InventoryCode: undefined, Type: undefined });
  };

  const renderQuantity = (val: number, record: any) => {
    if (val === 0 || !val) return <span className="text-gray-400 font-medium">-</span>;
    
    // Quantity > 0
    const color = mode === 'dark' ? '#4ade80' : '#16a34a'; // Bright green for dark, normal green for light
    return (
      <Button 
        type="link" 
        style={{ color, padding: 0, fontWeight: 600, textDecoration: 'underline' }}
        onClick={() => navigate(`/warehouse/inventory-movements?storageCode=${record.storageCode}&inventoryCode=${record.inventoryCode}`)}
      >
        {val.toLocaleString('zh-TW')}
      </Button>
    );
  };

  // Shared Sub Columns
  const subColumnsForInventory = [
    { title: '儲位編號', dataIndex: 'storageCode', width: 120 },
    { title: '儲位名稱', dataIndex: 'storageName', render: (val: string) => <EllipsisText text={val} /> },
    { title: '儲位類別', dataIndex: 'storageType', align: 'center', width: 100 },
    { title: '庫存量', dataIndex: 'quantity', align: 'right', width: 120, render: renderQuantity },
    { title: '最後更新時間', dataIndex: 'updatedAt', width: 180, render: (val: string) => val ? dayjs(val).format('YYYY/MM/DD HH:mm:ss') : '-' },
  ];

  const subColumnsForStorage = [
    { title: '物料編號', dataIndex: 'inventoryCode', width: 150 },
    { title: '物料名稱', dataIndex: 'inventoryName', render: (val: string) => <EllipsisText text={val} /> },
    { title: '庫存類型', dataIndex: 'type', align: 'center', width: 100, render: (val: string) => inventoryTypeOptions.find(o => o.value === val)?.label || '-' },
    { title: '庫存量', dataIndex: 'quantity', align: 'right', width: 120, render: renderQuantity },
    { title: '最後更新時間', dataIndex: 'updatedAt', width: 180, render: (val: string) => val ? dayjs(val).format('YYYY/MM/DD HH:mm:ss') : '-' },
  ];

  // Master Columns
  const inventoryMasterColumns = [
    { title: '物料編號', dataIndex: 'inventoryCode', width: 150 },
    { title: '物料名稱', dataIndex: 'inventoryName', render: (val: string) => <EllipsisText text={val} /> },
    { title: '庫存類型', dataIndex: 'type', align: 'center', width: 100, render: (val: string) => inventoryTypeOptions.find(o => o.value === val)?.label || '-' },
    { title: '總庫存量', dataIndex: 'totalQuantity', align: 'right', width: 120, render: (val: number) => val.toLocaleString('zh-TW') },
    { title: '儲位數', dataIndex: 'storageCount', align: 'right', width: 100 },
  ];

  const storageMasterColumns = [
    { title: '儲位編號', dataIndex: 'storageCode', width: 150 },
    { title: '儲位名稱', dataIndex: 'storageName', render: (val: string) => <EllipsisText text={val} /> },
    { title: '儲位類別', dataIndex: 'storageType', align: 'center', width: 100 },
    { title: '總庫存量', dataIndex: 'totalQuantity', align: 'right', width: 120, render: (val: number) => val.toLocaleString('zh-TW') },
    { title: '物料數', dataIndex: 'inventoryCount', align: 'right', width: 100 },
  ];

  return (
    <div className="p-4">
      <Card
        title="產品儲位庫存"
        extra={
          <Button icon={<SyncOutlined />} onClick={() => refetch()} loading={isFetching}>
            更新資料
          </Button>
        }
      >
        <Form form={form} layout="inline" className="mb-4" onFinish={handleSearch}>
          <Form.Item name="StorageCode" label="儲位">
            <DictSelect dictKey="STORAGE" placeholder="請選擇儲位" style={{ width: 220 }} allowClear />
          </Form.Item>
          <Form.Item name="InventoryCode" label="物料編號">
            <Input placeholder="請輸入物料編號" allowClear style={{ width: 220 }} />
          </Form.Item>
          <Form.Item name="Type" label="庫存類型">
            <Select placeholder="請選擇類型" allowClear style={{ width: 120 }} options={inventoryTypeOptions} />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<SearchOutlined />} loading={isFetching}>查詢</Button>
              <Button onClick={handleReset} icon={<ClearOutlined />}>清除</Button>
            </Space>
          </Form.Item>
        </Form>

        <Tabs defaultActiveKey="1">
          <TabPane tab="依物料分組" key="1">
            <Table
              rowKey="inventoryCode"
              loading={isFetching}
              dataSource={inventoryGroups}
              columns={inventoryMasterColumns as any}
              expandable={{
                expandedRowRender: (record) => (
                  <Table
                    rowKey={(r) => r.storageCode + r.updatedAt}
                    columns={subColumnsForInventory as any}
                    dataSource={record.items}
                    pagination={false}
                    size="small"
                    style={{ margin: '8px 0', backgroundColor: mode === 'dark' ? '#1f1f1f' : '#fafafa' }}
                  />
                ),
              }}
              pagination={false}
            />
          </TabPane>
          <TabPane tab="依儲位分組" key="2">
            <Table
              rowKey="storageCode"
              loading={isFetching}
              dataSource={storageGroups}
              columns={storageMasterColumns as any}
              expandable={{
                expandedRowRender: (record) => (
                  <Table
                    rowKey={(r) => r.inventoryCode + r.updatedAt}
                    columns={subColumnsForStorage as any}
                    dataSource={record.items}
                    pagination={false}
                    size="small"
                    style={{ margin: '8px 0', backgroundColor: mode === 'dark' ? '#1f1f1f' : '#fafafa' }}
                  />
                ),
              }}
              pagination={false}
            />
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
}
