import { useState, useMemo } from 'react';
import { Tabs, Button, Space, Form, Input, Select } from 'antd';
import { SyncOutlined, SearchOutlined, ClearOutlined } from '@ant-design/icons';
import { PageCard } from '@/components/common/PageCard';
import { useQuery } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { 
  getApiV1MaterialInventoryLogical, 
  getApiV1MaterialInventoryRolls, 
  getApiV1MaterialInventoryTransactions 
} from '@/api/generated/sdk.gen';
import { 
  getLogicalColumns, 
  getRollColumns, 
  getTxColumns, 
  rollStateOptions, 
  transactionTypeOptions 
} from './MaterialInventoryConfig';
import StandardErpTable from '@/components/Table/StandardErpTable';
import { DictSelect } from '@/components/Form/DictSelect';
import { buildTableColumns } from '@/utils/tableUtils';

export default function MaterialInventoryList() {
  const [activeTab, setActiveTab] = useState<string>('1');

  // ============================================================================
  // 1. 邏輯庫存 (Tab 1) States, Form, Query
  // ============================================================================
  const [logicalParams, setLogicalParams] = useState<any>({
    pageNumber: 1,
    pageSize: 20,
    MaterialCode: '',
    StorageCode: undefined
  });

  const logicalForm = useForm({
    defaultValues: {
      MaterialCode: '',
      StorageCode: undefined
    }
  });

  const { data: logicalData, isFetching: logicalLoading, refetch: refetchLogical } = useQuery({
    queryKey: ['material-inventory-logical', logicalParams.MaterialCode, logicalParams.StorageCode],
    queryFn: async () => {
      const res = await getApiV1MaterialInventoryLogical({
        query: {
          MaterialCode: logicalParams.MaterialCode || undefined,
          StorageCode: logicalParams.StorageCode || undefined,
          pageNumber: 1,
          pageSize: -1, // 🟢 獲取全量以在前端完成 100% 精確的邏輯分組與聚合！
        }
      });
      return res.data?.data;
    }
  });

  // 🟢 內存聚合分組
  const groupedLogicalList = useMemo(() => {
    const rawList = logicalData?.data || [];
    const groups: { [key: string]: any } = {};
    
    rawList.forEach((item: any) => {
      // 💡 以「原料品編」+「寬度」作為分組鍵 (相同品編但不同寬度的捲材分開統計)
      const key = `${item.materialCode}_${item.widthMm || 0}`;
      
      if (!groups[key]) {
        groups[key] = {
          materialCode: item.materialCode,
          materialName: item.materialName,
          materialForm: item.materialForm,
          widthMm: item.widthMm,
          lengthMm: item.lengthMm,
          quantity: 0,
          frozenQuantity: 0,
          storages: []
        };
      }
      
      const g = groups[key];
      g.quantity += item.quantity || 0;
      g.frozenQuantity += item.frozenQuantity || 0;
      
      // 計算長度
      let itemLength = item.lengthMm || 0;
      if (item.materialForm === "R" && (item.widthMm || 0) > 0) {
        itemLength = ((item.quantity || 0) * 1000) / item.widthMm; // SQM to M
      }
      
      g.storages.push({
        storageCode: item.storageCode,
        quantity: item.quantity || 0,
        frozenQuantity: item.frozenQuantity || 0,
        length: itemLength
      });
    });
    
    return Object.values(groups);
  }, [logicalData?.data]);

  // 🟢 本地前端分頁數據
  const paginatedLogicalData = useMemo(() => {
    const start = (logicalParams.pageNumber - 1) * logicalParams.pageSize;
    const end = logicalParams.pageNumber * logicalParams.pageSize;
    return groupedLogicalList.slice(start, end);
  }, [groupedLogicalList, logicalParams.pageNumber, logicalParams.pageSize]);

  const handleLogicalSearch = (values: any) => {
    setLogicalParams((prev: any) => ({
      ...prev,
      pageNumber: 1,
      MaterialCode: values.MaterialCode,
      StorageCode: values.StorageCode
    }));
  };

  const handleLogicalClear = () => {
    logicalForm.reset({
      MaterialCode: '',
      StorageCode: undefined
    });
    setLogicalParams({
      pageNumber: 1,
      pageSize: 20,
      MaterialCode: '',
      StorageCode: undefined
    });
  };

  // ============================================================================
  // 2. 實體卷卡 LPN (Tab 2) States, Form, Query
  // ============================================================================
  const [rollParams, setRollParams] = useState<any>({
    pageNumber: 1,
    pageSize: 20,
    RollNo: '',
    MaterialCode: '',
    StorageCode: undefined,
    RollStatus: ['INSTOCK'] // 預設只顯示在庫的卷卡，方便查庫存
  });

  const rollForm = useForm<{
    RollNo: string;
    MaterialCode: string;
    StorageCode: string | undefined;
    RollStatus: string[];
  }>({
    defaultValues: {
      RollNo: '',
      MaterialCode: '',
      StorageCode: undefined,
      RollStatus: ['INSTOCK']
    }
  });

  const { data: rollData, isFetching: rollLoading, refetch: refetchRolls } = useQuery({
    queryKey: ['material-inventory-rolls', rollParams],
    queryFn: async () => {
      const res = await getApiV1MaterialInventoryRolls({
        query: {
          RollNo: rollParams.RollNo || undefined,
          MaterialCode: rollParams.MaterialCode || undefined,
          StorageCode: rollParams.StorageCode || undefined,
          RollStatus: Array.isArray(rollParams.RollStatus)
            ? (rollParams.RollStatus.length > 0 ? rollParams.RollStatus.join(',') : undefined)
            : rollParams.RollStatus || undefined,
          pageNumber: rollParams.pageNumber,
          pageSize: rollParams.pageSize,
        }
      });
      return res.data?.data;
    }
  });

  const handleRollSearch = (values: any) => {
    setRollParams((prev: any) => ({
      ...prev,
      pageNumber: 1,
      RollNo: values.RollNo,
      MaterialCode: values.MaterialCode,
      StorageCode: values.StorageCode,
      RollStatus: values.RollStatus
    }));
  };

  const handleSelectAllStatuses = () => {
    rollForm.setValue('RollStatus', rollStateOptions.map(opt => opt.value));
  };

  const handleRollClear = () => {
    rollForm.reset({
      RollNo: '',
      MaterialCode: '',
      StorageCode: undefined,
      RollStatus: []
    });
    setRollParams({
      pageNumber: 1,
      pageSize: 20,
      RollNo: '',
      MaterialCode: '',
      StorageCode: undefined,
      RollStatus: []
    });
  };

  // 點擊母卷條碼時，自動追溯查詢
  const handleSelectParentBarcode = (parentBarcode: string) => {
    const allStatuses = rollStateOptions.map(opt => opt.value);
    rollForm.setValue('RollNo', parentBarcode);
    rollForm.setValue('RollStatus', allStatuses); // 清除狀態限制，因為母卷可能已被消耗，故全選所有狀態
    setRollParams((prev: any) => ({
      ...prev,
      pageNumber: 1,
      RollNo: parentBarcode,
      RollStatus: allStatuses
    }));
  };

  // ============================================================================
  // 3. 異動流水帳 (Tab 3) States, Form, Query
  // ============================================================================
  const [txParams, setTxParams] = useState<any>({
    pageNumber: 1,
    pageSize: 20,
    MaterialCode: '',
    LotNo: '',
    StorageCode: undefined,
    SourceDocCode: '',
    DocType: ''
  });

  const txForm = useForm({
    defaultValues: {
      MaterialCode: '',
      LotNo: '',
      StorageCode: undefined,
      SourceDocCode: '',
      DocType: ''
    }
  });

  const { data: txData, isFetching: txLoading, refetch: refetchTx } = useQuery({
    queryKey: ['material-inventory-transactions', txParams],
    queryFn: async () => {
      const res = await getApiV1MaterialInventoryTransactions({
        query: {
          MaterialCode: txParams.MaterialCode || undefined,
          LotNo: txParams.LotNo || undefined,
          StorageCode: txParams.StorageCode || undefined,
          SourceDocCode: txParams.SourceDocCode || undefined,
          DocType: txParams.DocType || undefined,
          pageNumber: txParams.pageNumber,
          pageSize: txParams.pageSize,
        }
      });
      return res.data?.data;
    }
  });

  const handleTxSearch = (values: any) => {
    setTxParams((prev: any) => ({
      ...prev,
      pageNumber: 1,
      MaterialCode: values.MaterialCode,
      LotNo: values.LotNo,
      StorageCode: values.StorageCode,
      SourceDocCode: values.SourceDocCode,
      DocType: values.DocType
    }));
  };

  const handleTxClear = () => {
    txForm.reset({
      MaterialCode: '',
      LotNo: '',
      StorageCode: undefined,
      SourceDocCode: '',
      DocType: ''
    });
    setTxParams({
      pageNumber: 1,
      pageSize: 20,
      MaterialCode: '',
      LotNo: '',
      StorageCode: undefined,
      SourceDocCode: '',
      DocType: ''
    });
  };

  // ============================================================================
  // Tab 切換與更新
  // ============================================================================
  const handleRefetchActiveTab = () => {
    if (activeTab === '1') refetchLogical();
    if (activeTab === '2') refetchRolls();
    if (activeTab === '3') refetchTx();
  };

  const isFetchingActiveTab = logicalLoading || rollLoading || txLoading;

  // 實體卷卡列表 Columns 注入母卷追溯事件
  const rollColumns = useMemo(() => buildTableColumns(getRollColumns(handleSelectParentBarcode)), []);
  const logicalColumns = useMemo(() => buildTableColumns(getLogicalColumns()), []);
  const txColumns = useMemo(() => buildTableColumns(getTxColumns()), []);

  return (
    <div className="p-4 pb-0 flex flex-col" style={{ height: 'calc(100vh - 64px)' }}>
      <PageCard
        title="原料庫存與 WIP 卷卡追溯"
        extra={
          <Button 
            icon={<SyncOutlined />} 
            onClick={handleRefetchActiveTab} 
            loading={isFetchingActiveTab}
          >
            更新資料
          </Button>
        }
      >
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <style>{`
            .ant-card-body { display: flex; flex-direction: column; }
            .ant-tabs { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
            .ant-tabs-content-holder { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
            .ant-tabs-content { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
            .ant-tabs-tabpane { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
            .ant-table-body { max-height: calc(100vh - 380px) !important; overflow-y: auto !important; }
          `}</style>
          
          <Tabs 
            activeKey={activeTab} 
            onChange={(key) => setActiveTab(key)} 
            style={{ flex: 1 }}
            items={[
              {
                key: '1',
                label: '邏輯總量庫存',
                children: (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Tab 1 Form */}
                    <Form 
                      layout="inline" 
                      className="mb-4 pb-4 border-b border-slate-200 dark:border-slate-800 flex !flex-row !flex-nowrap items-center gap-x-4 gap-y-0 shrink-0 overflow-x-auto overflow-y-hidden" 
                      onFinish={logicalForm.handleSubmit(handleLogicalSearch)}
                    >
                      <Form.Item>
                        <Space>
                          <Button type="primary" htmlType="submit" icon={<SearchOutlined />} loading={logicalLoading}>查詢</Button>
                          <Button onClick={handleLogicalClear} icon={<ClearOutlined />}>清除</Button>
                        </Space>
                      </Form.Item>
                      <Form.Item label="原料品編">
                        <Controller 
                          name="MaterialCode" 
                          control={logicalForm.control} 
                          render={({field}: any) => <Input {...field} placeholder="原料品編" allowClear className="w-36 min-w-[140px] shrink-0" />} 
                        />
                      </Form.Item>
                      <Form.Item label="儲位">
                        <Controller 
                          name="StorageCode" 
                          control={logicalForm.control} 
                          render={({field}: any) => <DictSelect {...field} dictKey="STORAGE" optionsFilter={(opt: any) => opt.type === 'MAT'} placeholder="選擇儲位" className="w-48 min-w-[240px] shrink-0" allowClear />} 
                        />
                      </Form.Item>
                    </Form>

                    {/* Tab 1 Table */}
                    <div className="flex-1 min-h-0 flex flex-col">
                      <StandardErpTable
                        rowKey={(record: any) => `${record.materialCode}_${record.widthMm || 0}`}
                        loading={logicalLoading}
                        dataSource={paginatedLogicalData}
                        columns={logicalColumns as any}
                        pagination={{
                          current: logicalParams.pageNumber,
                          pageSize: logicalParams.pageSize,
                          total: groupedLogicalList.length,
                          onChange: (page, size) => {
                            setLogicalParams((prev: any) => ({ ...prev, pageNumber: page, pageSize: size }));
                          },
                          showSizeChanger: true,
                          showTotal: (total) => `共 ${total} 筆`,
                        }}
                      />
                    </div>
                  </div>
                )
              },
              {
                key: '2',
                label: '一卷一卡 LPN WIP 追溯',
                children: (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Tab 2 Form */}
                    <Form 
                      layout="inline" 
                      className="mb-4 pb-4 border-b border-slate-200 dark:border-slate-800 flex !flex-row !flex-nowrap items-center gap-x-2 gap-y-0 shrink-0 overflow-x-auto overflow-y-hidden" 
                      onFinish={rollForm.handleSubmit(handleRollSearch)}
                    >
                      <Form.Item>
                        <Space>
                          <Button type="primary" htmlType="submit" icon={<SearchOutlined />} loading={rollLoading}>查詢</Button>
                          <Button onClick={handleRollClear} icon={<ClearOutlined />}>清除</Button>
                        </Space>
                      </Form.Item>
                      <Form.Item label="卷卡號">
                        <Controller 
                          name="RollNo" 
                          control={rollForm.control} 
                          render={({field}: any) => <Input {...field} placeholder="LPN 條碼" allowClear className="w-32 min-w-[120px] shrink-0" />} 
                        />
                      </Form.Item>
                      <Form.Item label="品編">
                        <Controller 
                          name="MaterialCode" 
                          control={rollForm.control} 
                          render={({field}: any) => <Input {...field} placeholder="原料品編" allowClear className="w-28 min-w-[110px] shrink-0" />} 
                        />
                      </Form.Item>
                      <Form.Item label="儲位">
                        <Controller 
                          name="StorageCode" 
                          control={rollForm.control} 
                          render={({field}: any) => <DictSelect {...field} dictKey="STORAGE" optionsFilter={(opt: any) => opt.type === 'MAT'} placeholder="儲位" className="w-48 min-w-[240px] shrink-0" allowClear />} 
                        />
                      </Form.Item>
                      <Form.Item label="狀態">
                        <Space.Compact className="w-auto">
                          <Controller 
                            name="RollStatus" 
                            control={rollForm.control} 
                            render={({field}: any) => (
                              <Select 
                                {...field} 
                                mode="multiple"
                                placeholder="全部狀態" 
                                allowClear
                                className="w-32 min-w-[120px] shrink-0" 
                                options={rollStateOptions} 
                                maxTagCount={1}
                              />
                            )} 
                          />
                          <Button onClick={handleSelectAllStatuses}>全選</Button>
                        </Space.Compact>
                      </Form.Item>
                    </Form>

                    {/* Tab 2 Table */}
                    <div className="flex-1 min-h-0 flex flex-col">
                      <StandardErpTable
                        rowKey="rollNo"
                        loading={rollLoading}
                        dataSource={rollData?.data || []}
                        columns={rollColumns as any}
                        pagination={{
                          current: rollParams.pageNumber,
                          pageSize: rollParams.pageSize,
                          total: rollData?.totalRecords || 0,
                          onChange: (page, size) => {
                            setRollParams((prev: any) => ({ ...prev, pageNumber: page, pageSize: size }));
                          },
                          showSizeChanger: true,
                          showTotal: (total) => `共 ${total} 筆`,
                        }}
                      />
                    </div>
                  </div>
                )
              },
              {
                key: '3',
                label: '庫存異動流水帳',
                children: (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Tab 3 Form */}
                    <Form 
                      layout="inline" 
                      className="mb-4 pb-4 border-b border-slate-200 dark:border-slate-800 flex !flex-row !flex-nowrap items-center gap-x-4 gap-y-0 shrink-0 overflow-x-auto overflow-y-hidden" 
                      onFinish={txForm.handleSubmit(handleTxSearch)}
                    >
                      <Form.Item>
                        <Space>
                          <Button type="primary" htmlType="submit" icon={<SearchOutlined />} loading={txLoading}>查詢</Button>
                          <Button onClick={handleTxClear} icon={<ClearOutlined />}>清除</Button>
                        </Space>
                      </Form.Item>
                      <Form.Item label="原料品編">
                        <Controller 
                          name="MaterialCode" 
                          control={txForm.control} 
                          render={({field}: any) => <Input {...field} placeholder="原料品編" allowClear className="w-32 min-w-[120px] shrink-0" />} 
                        />
                      </Form.Item>
                      <Form.Item label="卷卡條碼">
                        <Controller 
                          name="LotNo" 
                          control={txForm.control} 
                          render={({field}: any) => <Input {...field} placeholder="卷卡號" allowClear className="w-36 min-w-[110px] shrink-0" />} 
                        />
                      </Form.Item>
                      <Form.Item label="異動儲位">
                        <Controller 
                          name="StorageCode" 
                          control={txForm.control} 
                          render={({field}: any) => <DictSelect {...field} dictKey="STORAGE" optionsFilter={(opt: any) => opt.type === 'MAT'} placeholder="選擇儲位" className="w-48 min-w-[240px] shrink-0" allowClear />} 
                        />
                      </Form.Item>
                      <Form.Item label="交易類型">
                        <Controller 
                          name="DocType" 
                          control={txForm.control} 
                          render={({field}: any) => (
                            <Select 
                              {...field} 
                              placeholder="交易類型" 
                              allowClear 
                              className="w-32 min-w-[180px] shrink-0" 
                              options={transactionTypeOptions} 
                            />
                          )} 
                        />
                      </Form.Item>
                    </Form>

                    {/* Tab 3 Table */}
                    <div className="flex-1 min-h-0 flex flex-col">
                      <StandardErpTable
                        rowKey="transactionId"
                        loading={txLoading}
                        dataSource={txData?.data || []}
                        columns={txColumns as any}
                        pagination={{
                          current: txParams.pageNumber,
                          pageSize: txParams.pageSize,
                          total: txData?.totalRecords || 0,
                          onChange: (page, size) => {
                            setTxParams((prev: any) => ({ ...prev, pageNumber: page, pageSize: size }));
                          },
                          showSizeChanger: true,
                          showTotal: (total) => `共 ${total} 筆`,
                        }}
                      />
                    </div>
                  </div>
                )
              }
            ]}
          />
        </div>
      </PageCard>
    </div>
  );
}
