import { useState, useMemo } from 'react';
import { Tabs, Button, Space, Form, Input, Select, App } from 'antd';
import { SyncOutlined, SearchOutlined, ClearOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { PageCard } from '@/components/common/PageCard';
import { useQuery } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { 
  getApiV1MaterialInventoryLogical, 
  getApiV1MaterialInventoryRolls, 
  getApiV1MaterialInventoryTransactions,
  postApiV1MaterialInventoryRollScrap
} from '@/api/generated/sdk.gen';
import { 
  getRollLogicalColumns, 
  getSheetLogicalColumns, 
  getRollColumns, 
  getTxColumns, 
  rollStateOptions, 
  transactionTypeOptions 
} from './MaterialInventoryConfig';
import { useFileDownload } from '@/hooks/useFileDownload';
import { client } from '@/api/generated/client.gen';
import StandardErpTable from '@/components/Table/StandardErpTable';
import { DictSelect } from '@/components/Form/DictSelect';
import { buildTableColumns } from '@/utils/tableUtils';

export default function MaterialInventoryList() {
  const { modal, message } = App.useApp();
  const [activeTab, setActiveTab] = useState<string>('1');

  // ============================================================================
  // 1. 捲材邏輯庫存 (Tab 1) States, Form, Query
  // ============================================================================
  const [rollLogicalParams, setRollLogicalParams] = useState<any>({
    pageNumber: 1,
    pageSize: 20,
    MaterialCode: '',
    StorageCode: undefined
  });

  const rollLogicalForm = useForm({
    defaultValues: {
      MaterialCode: '',
      StorageCode: undefined
    }
  });

  const { data: rollLogicalData, isFetching: rollLogicalLoading, refetch: refetchRollLogical } = useQuery({
    queryKey: ['material-inventory-roll-logical', rollLogicalParams.MaterialCode, rollLogicalParams.StorageCode],
    queryFn: async () => {
      const res = await getApiV1MaterialInventoryLogical({
        query: {
          MaterialCode: rollLogicalParams.MaterialCode || undefined,
          StorageCode: rollLogicalParams.StorageCode || undefined,
          pageNumber: 1,
          pageSize: -1,
        }
      });
      return res.data?.data;
    }
  });

  // 🟢 捲材內存聚合分組
  const rollGroupedList = useMemo(() => {
    const rawList = rollLogicalData?.data || [];
    const filtered = rawList.filter((item: any) => item.materialForm === "R");
    const groups: { [key: string]: any } = {};
    
    filtered.forEach((item: any) => {
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
      
      let itemLength = item.lengthMm || 0;
      let itemFrozenLength = item.lengthMm || 0;
      if ((item.widthMm || 0) > 0) {
        itemLength = ((item.quantity || 0) * 1000) / item.widthMm; // SQM to M
        itemFrozenLength = ((item.frozenQuantity || 0) * 1000) / item.widthMm; // SQM to M
      }
      
      g.storages.push({
        storageCode: item.storageCode,
        quantity: item.quantity || 0,
        frozenQuantity: item.frozenQuantity || 0,
        length: itemLength,
        frozenLength: itemFrozenLength
      });
    });
    
    return Object.values(groups);
  }, [rollLogicalData?.data]);

  // 🟢 捲材本地前端分頁數據
  const rollPaginatedData = useMemo(() => {
    const start = (rollLogicalParams.pageNumber - 1) * rollLogicalParams.pageSize;
    const end = rollLogicalParams.pageNumber * rollLogicalParams.pageSize;
    return rollGroupedList.slice(start, end);
  }, [rollGroupedList, rollLogicalParams.pageNumber, rollLogicalParams.pageSize]);

  const handleRollLogicalSearch = (values: any) => {
    setRollLogicalParams((prev: any) => ({
      ...prev,
      pageNumber: 1,
      MaterialCode: values.MaterialCode,
      StorageCode: values.StorageCode
    }));
  };

  const handleRollLogicalClear = () => {
    rollLogicalForm.reset({
      MaterialCode: '',
      StorageCode: undefined
    });
    setRollLogicalParams({
      pageNumber: 1,
      pageSize: 20,
      MaterialCode: '',
      StorageCode: undefined
    });
  };

  // ============================================================================
  // 2. 片材邏輯庫存 (Tab 2) States, Form, Query
  // ============================================================================
  const [sheetLogicalParams, setSheetLogicalParams] = useState<any>({
    pageNumber: 1,
    pageSize: 20,
    MaterialCode: '',
    StorageCode: undefined
  });

  const sheetLogicalForm = useForm({
    defaultValues: {
      MaterialCode: '',
      StorageCode: undefined
    }
  });

  const { data: sheetLogicalData, isFetching: sheetLogicalLoading, refetch: refetchSheetLogical } = useQuery({
    queryKey: ['material-inventory-sheet-logical', sheetLogicalParams.MaterialCode, sheetLogicalParams.StorageCode],
    queryFn: async () => {
      const res = await getApiV1MaterialInventoryLogical({
        query: {
          MaterialCode: sheetLogicalParams.MaterialCode || undefined,
          StorageCode: sheetLogicalParams.StorageCode || undefined,
          pageNumber: 1,
          pageSize: -1,
        }
      });
      return res.data?.data;
    }
  });

  // 🟢 片材內存聚合分組
  const sheetGroupedList = useMemo(() => {
    const rawList = sheetLogicalData?.data || [];
    const filtered = rawList.filter((item: any) => item.materialForm !== "R");
    const groups: { [key: string]: any } = {};
    
    filtered.forEach((item: any) => {
      const key = `${item.materialCode}_${item.widthMm || 0}_${item.lengthMm || 0}`;
      
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
      
      g.storages.push({
        storageCode: item.storageCode,
        quantity: item.quantity || 0,
        frozenQuantity: item.frozenQuantity || 0
      });
    });
    
    return Object.values(groups);
  }, [sheetLogicalData?.data]);

  // 🟢 片材本地前端分頁數據
  const sheetPaginatedData = useMemo(() => {
    const start = (sheetLogicalParams.pageNumber - 1) * sheetLogicalParams.pageSize;
    const end = sheetLogicalParams.pageNumber * sheetLogicalParams.pageSize;
    return sheetGroupedList.slice(start, end);
  }, [sheetGroupedList, sheetLogicalParams.pageNumber, sheetLogicalParams.pageSize]);

  const handleSheetLogicalSearch = (values: any) => {
    setSheetLogicalParams((prev: any) => ({
      ...prev,
      pageNumber: 1,
      MaterialCode: values.MaterialCode,
      StorageCode: values.StorageCode
    }));
  };

  const handleSheetLogicalClear = () => {
    sheetLogicalForm.reset({
      MaterialCode: '',
      StorageCode: undefined
    });
    setSheetLogicalParams({
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
    setActiveTab('3'); // 🟢 自動切換到原料卷卡號分頁
  };

  // ============================================================================
  // 3. 異動流水帳 (Tab 4) States, Form, Query
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

  // 🌀 手動報廢/作廢實體卷卡
  const handleScrapRoll = (record: any) => {
    let scrapNotes = "";
    modal.confirm({
      title: "確定要報廢此原料卷卡嗎？",
      icon: <ExclamationCircleOutlined className="text-red-500" />,
      content: (
        <div className="mt-2 space-y-2">
          <p className="text-sm text-slate-500">卷卡號 (LPN): <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{record.rollNo}</span></p>
          <p className="text-sm text-slate-500">剩餘數量/長度: <span className="font-semibold text-slate-800 dark:text-slate-200">{record.currentQtyAux} M</span></p>
          <p className="text-sm text-red-500 font-semibold">⚠️ 警告：報廢後將自動扣除此卷卡在該儲位的可用/凍結邏輯庫存，且此操作不可逆！</p>
          <div className="pt-2">
            <span className="text-sm text-slate-600 block mb-1">報廢備註：</span>
            <Input 
              placeholder="請輸入報廢原因或批註 (選填)" 
              onChange={(e) => { scrapNotes = e.target.value; }} 
            />
          </div>
        </div>
      ),
      okText: "確認報廢",
      okType: "danger",
      cancelText: "取消",
      onOk: async () => {
        try {
          const res = await postApiV1MaterialInventoryRollScrap({
            query: {
              rollNo: record.rollNo,
              notes: scrapNotes
            }
          });
          if (res.data?.success) {
            message.success("卷卡報廢成功！已自動重算同步對應規格之邏輯儲位庫存。");
            refetchRollLogical();
            refetchSheetLogical();
            refetchRolls();
            refetchTx();
          } else {
            message.error(res.data?.message || "報廢失敗");
          }
        } catch (err: any) {
          message.error(err.message || "報廢失敗，請聯絡系統管理員");
        }
      }
    });
  };

  const { downloadFile } = useFileDownload();

  const handlePrintLabel = (record: any) => {
    const rollNo = record.rollNo;
    if (!rollNo) return;
    downloadFile({
      apiFunction: () =>
        client.get({
          url: `/api/v1/IqcInspection/rolls/${rollNo}/label-pdf`,
          responseType: "blob",
        }),
      successMessage: `LPN ${rollNo} 標籤補印 PDF 導出成功！`,
      filename: `LABEL-${rollNo}.pdf`,
      openInNewTab: true,
    });
  };

  // ============================================================================
  // Tab 切換與更新
  // ============================================================================
  const handleRefetchActiveTab = () => {
    if (activeTab === '1') refetchRollLogical();
    if (activeTab === '2') refetchSheetLogical();
    if (activeTab === '3') refetchRolls();
    if (activeTab === '4') refetchTx();
  };

  const isFetchingActiveTab = rollLogicalLoading || sheetLogicalLoading || rollLoading || txLoading;

  // 實體卷卡列表 Columns 注入母卷追溯事件、手動報廢事件與補印標籤事件
  const rollColumns = useMemo(() => buildTableColumns(getRollColumns(handleSelectParentBarcode, handleScrapRoll, handlePrintLabel)), [handleSelectParentBarcode]);
  const rollLogicalColumns = useMemo(() => buildTableColumns(getRollLogicalColumns()), []);
  const sheetLogicalColumns = useMemo(() => buildTableColumns(getSheetLogicalColumns()), []);
  const txColumns = useMemo(() => buildTableColumns(getTxColumns()), []);

  return (
    <div className="p-4 pb-0 flex flex-col" style={{ height: 'calc(100vh - 64px)' }}>
      <PageCard
        title="原料庫存與卷卡號追溯"
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
                label: '捲材邏輯庫存總量',
                children: (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Tab 1 Form */}
                    <Form 
                      layout="inline" 
                      className="mb-4 pb-4 border-b border-slate-200 dark:border-slate-800 flex !flex-row !flex-nowrap items-center gap-x-4 gap-y-0 shrink-0 overflow-x-auto overflow-y-hidden" 
                      onFinish={rollLogicalForm.handleSubmit(handleRollLogicalSearch)}
                    >
                      <Form.Item>
                        <Space>
                          <Button type="primary" htmlType="submit" icon={<SearchOutlined />} loading={rollLogicalLoading}>查詢</Button>
                          <Button onClick={handleRollLogicalClear} icon={<ClearOutlined />}>清除</Button>
                        </Space>
                      </Form.Item>
                      <Form.Item label="原料品編">
                        <Controller 
                          name="MaterialCode" 
                          control={rollLogicalForm.control} 
                          render={({field}: any) => <Input {...field} placeholder="原料品編" allowClear className="w-36 min-w-[140px] shrink-0" />} 
                        />
                      </Form.Item>
                      <Form.Item label="儲位">
                        <Controller 
                          name="StorageCode" 
                          control={rollLogicalForm.control} 
                          render={({field}: any) => <DictSelect {...field} dictKey="STORAGE" optionsFilter={(opt: any) => opt.type === 'MAT'} placeholder="選擇儲位" className="w-48 min-w-[240px] shrink-0" allowClear />} 
                        />
                      </Form.Item>
                    </Form>

                    {/* Tab 1 Table */}
                    <div className="flex-1 min-h-0 flex flex-col">
                      <StandardErpTable
                        rowKey={(record: any) => `${record.materialCode}_${record.widthMm || 0}`}
                        loading={rollLogicalLoading}
                        dataSource={rollPaginatedData}
                        columns={rollLogicalColumns as any}
                        pagination={{
                          current: rollLogicalParams.pageNumber,
                          pageSize: rollLogicalParams.pageSize,
                          total: rollGroupedList.length,
                          onChange: (page, size) => {
                            setRollLogicalParams((prev: any) => ({ ...prev, pageNumber: page, pageSize: size }));
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
                label: '片材邏輯庫存總量',
                children: (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Tab 2 Form */}
                    <Form 
                      layout="inline" 
                      className="mb-4 pb-4 border-b border-slate-200 dark:border-slate-800 flex !flex-row !flex-nowrap items-center gap-x-4 gap-y-0 shrink-0 overflow-x-auto overflow-y-hidden" 
                      onFinish={sheetLogicalForm.handleSubmit(handleSheetLogicalSearch)}
                    >
                      <Form.Item>
                        <Space>
                          <Button type="primary" htmlType="submit" icon={<SearchOutlined />} loading={sheetLogicalLoading}>查詢</Button>
                          <Button onClick={handleSheetLogicalClear} icon={<ClearOutlined />}>清除</Button>
                        </Space>
                      </Form.Item>
                      <Form.Item label="原料品編">
                        <Controller 
                          name="MaterialCode" 
                          control={sheetLogicalForm.control} 
                          render={({field}: any) => <Input {...field} placeholder="原料品編" allowClear className="w-36 min-w-[140px] shrink-0" />} 
                        />
                      </Form.Item>
                      <Form.Item label="儲位">
                        <Controller 
                          name="StorageCode" 
                          control={sheetLogicalForm.control} 
                          render={({field}: any) => <DictSelect {...field} dictKey="STORAGE" optionsFilter={(opt: any) => opt.type === 'MAT'} placeholder="選擇儲位" className="w-48 min-w-[240px] shrink-0" allowClear />} 
                        />
                      </Form.Item>
                    </Form>

                    {/* Tab 2 Table */}
                    <div className="flex-1 min-h-0 flex flex-col">
                      <StandardErpTable
                        rowKey={(record: any) => `${record.materialCode}_${record.widthMm || 0}_${record.lengthMm || 0}`}
                        loading={sheetLogicalLoading}
                        dataSource={sheetPaginatedData}
                        columns={sheetLogicalColumns as any}
                        pagination={{
                          current: sheetLogicalParams.pageNumber,
                          pageSize: sheetLogicalParams.pageSize,
                          total: sheetGroupedList.length,
                          onChange: (page, size) => {
                            setSheetLogicalParams((prev: any) => ({ ...prev, pageNumber: page, pageSize: size }));
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
                label: '原料卷卡號',
                children: (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Tab 3 Form */}
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

                    {/* Tab 3 Table */}
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
                key: '4',
                label: '庫存異動流水帳',
                children: (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Tab 4 Form */}
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

                    {/* Tab 4 Table */}
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
