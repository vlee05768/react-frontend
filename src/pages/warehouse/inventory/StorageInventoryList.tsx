// @ts-nocheck
import { useMemo, useState, useEffect } from 'react';
import { Tabs, Button, Space, ConfigProvider, Modal, Divider } from 'antd';
import { PageCard } from '@/components/common/PageCard';
import { SearchOutlined, ClearOutlined, SyncOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { getApiV1StorageInventory } from '@/api/generated/sdk.gen';
import { useThemeStore } from '@/stores/useThemeStore';
import { useNavigate, useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';

import { inventoryTypeOptions, searchFields } from './StorageInventoryConfig';
import { EllipsisText } from '@/components/Table/EllipsisText';
import { useErpListQuery } from '@/hooks/useErpListQuery';
import ActiveQueryAndSortTags from '@/components/Table/ActiveQueryAndSortTags';
import StandardErpTable from '@/components/Table/StandardErpTable';
import DynamicSearchForm from '@/components/Form/DynamicSearchForm';
import { MODAL_WIDTH_SEARCH, MODAL_BODY_MAX_HEIGHT } from '@/constants/ui';

export default function StorageInventoryList() {
  const { mode } = useThemeStore();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const initialStorageCode = searchParams.get('storageCode') || undefined;
  const initialInventoryCode = searchParams.get('inventoryCode') || undefined;

  const [queryParams, setQueryParams] = useState<any>({
    StorageCode: initialStorageCode,
    InventoryCode: initialInventoryCode,
  });

  const [activeTab, setActiveTab] = useState<string>('1');

  // Add states for expanded rows
  const [expandedInventoryKeys, setExpandedInventoryKeys] = useState<readonly React.Key[]>([]);
  const [expandedStorageKeys, setExpandedStorageKeys] = useState<readonly React.Key[]>([]);

  const listQuery = useErpListQuery({
    params: queryParams,
    setParams: (newParams: any) => {
      setQueryParams((prev: any) => {
        const next = typeof newParams === 'function' ? newParams(prev) : newParams;
        return { ...prev, ...next };
      });
    },
    pageKey: 'pageNumber',
  });

  useEffect(() => {
    // 1. 同步 Form 狀態
    listQuery.searchForm.reset(queryParams);

    // 2. 更新對應的 Tab 與展開狀態
    if (queryParams.StorageCode) {
      setActiveTab('2');
      setExpandedStorageKeys([queryParams.StorageCode]);
      setExpandedInventoryKeys([]);
    } else {
      setActiveTab('1');
      if (queryParams.InventoryCode) {
        setExpandedInventoryKeys([queryParams.InventoryCode]);
        setExpandedStorageKeys([]);
      }
    }
  }, [queryParams]);

  const { data, isFetching, refetch } = useQuery({
    queryKey: ['storage-inventory', queryParams],
    queryFn: async () => {
      // 僅傳入 API 支援的 query 參數，避免 excess property checking 或 400
      const { StorageCode, InventoryCode } = queryParams;
      const res = await getApiV1StorageInventory({
        query: {
          StorageCode,
          InventoryCode,
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
          customerName: item.customerName || '',
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
    { title: '客戶', dataIndex: 'customerName', width: 300, render: (val: string) => val || <span className="text-gray-400">-</span> },
    { title: '物料編號', dataIndex: 'inventoryCode', width: 300 },
    { title: '物料名稱', dataIndex: 'inventoryName', render: (val: string) => <EllipsisText text={val} /> },
    { title: '庫存量', dataIndex: 'quantity', align: 'right', width: 160, render: renderQuantity },
    { title: '最後更新時間', dataIndex: 'updatedAt', width: 180, render: (val: string) => val ? dayjs(val).format('YYYY/MM/DD HH:mm:ss') : '-' },
  ];

  // Master Columns
  const inventoryMasterColumns = [
    { title: '庫存類型', dataIndex: 'type', align: 'center', width: 100, render: (val: string) => inventoryTypeOptions.find(o => o.value === val)?.label || '-' },
    { title: '客戶', dataIndex: 'customerName', width: 300, render: (val: string) => val || <span className="text-gray-400">-</span> },
    { title: '物料編號', dataIndex: 'inventoryCode', width: 300 },
    { title: '物料名稱', dataIndex: 'inventoryName', render: (val: string) => <EllipsisText text={val} /> },
    { title: '總庫存量', dataIndex: 'totalQuantity', align: 'right', width: 160, render: (val: number) => val.toLocaleString('zh-TW') },
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
    <div className="p-4 pb-0 flex flex-col" style={{ height: 'calc(100vh - 64px)' }}>
      <PageCard
        title="產品儲位庫存"
        extra={
          <Space separator={<Divider orientation="vertical" />}>
            <Button
              type="default"
              icon={<SearchOutlined />}
              onClick={listQuery.openSearchModal}
            >
              查詢
            </Button>
            <Button icon={<SyncOutlined />} onClick={() => refetch()} loading={isFetching}>
              更新資料
            </Button>
          </Space>
        }
      >

        <ActiveQueryAndSortTags
          searchConfig={searchFields}
          tableColumns={activeTab === '1' ? inventoryMasterColumns : storageMasterColumns}
          params={queryParams}
          onQueryTagClose={listQuery.handleClearQueryField}
          onSortTagClose={listQuery.handleClearSortField}
          onClearSort={listQuery.handleClearAllSort}
        />

        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <style>{`
            .ant-card-body { display: flex; flex-direction: column; }
            .ant-tabs { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
            .ant-tabs-content { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
            .ant-tabs-tabpane { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
          `}</style>
          <Tabs 
            activeKey={activeTab} 
            onChange={(key) => setActiveTab(key)} 
            style={{ flex: 1 }}
            items={[
              {
                key: '1',
                label: '依物料分組',
                children: (
                  <StandardErpTable
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
                                headerColor: mode === 'dark' ? '#475569' : '#475569',
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
                            <StandardErpTable
                              rowKey={(r) => r.storageCode + r.updatedAt}
                              columns={subColumnsForInventory as any}
                              dataSource={record.items}
                              pagination={false}
                              size="small"
                              scroll={{ x: 'max-content' }} />
                          </div>
                        </ConfigProvider>
                      ),
                    }}
                    pagination={false}
                    scroll={{ x: 'max-content', y: 300 }} />
                )
              },
              {
                key: '2',
                label: '依儲位分組',
                children: (
                  <StandardErpTable
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
                                headerColor: mode === 'dark' ? '#166534' : '#166534',
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
                            <StandardErpTable
                              rowKey={(r) => r.inventoryCode + r.updatedAt}
                              columns={subColumnsForStorage as any}
                              dataSource={record.items}
                              pagination={false}
                              size="small"
                              scroll={{ x: 'max-content' }} />
                          </div>
                        </ConfigProvider>
                      ),
                    }}
                    pagination={false}
                    scroll={{ x: 'max-content', y: 300 }} />
                )
              }
            ]}
          />
        </div>
      </PageCard>

      <Modal
        title={
          <div className="font-semibold pb-3 mb-2 text-[18px] border-b border-[var(--ant-color-border-secondary)]">
            查詢條件設定
          </div>
        }
        open={listQuery.isSearchModalOpen}
        onCancel={() => listQuery.setIsSearchModalOpen(false)}
        footer={
          <div className="pt-4 flex justify-end gap-2 border-t border-[var(--ant-color-border-secondary)]">
            <Button icon={<ClearOutlined />} onClick={listQuery.handleClear}>
              清除條件
            </Button>
            <Button type="primary" icon={<SearchOutlined />} htmlType="submit" form="search-form">
              執行查詢
            </Button>
          </div>
        }
        width={MODAL_WIDTH_SEARCH}
        className="top-[10vh]"
        styles={{
          body: {
            maxHeight: MODAL_BODY_MAX_HEIGHT,
            overflowY: 'auto',
            padding: '24px 24px 0 24px'
          }
        }}
        closeIcon={true}
      >
        <DynamicSearchForm 
          config={searchFields} 
          form={listQuery.searchForm} 
          onSearch={listQuery.handleSearch} 
        />
      </Modal>
    </div>
  );
}
