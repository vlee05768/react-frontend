import React, { useState, useRef, useEffect } from 'react';
import { Card, Input, Button, Badge, Spin, Table, Tag, App, Popconfirm, Tooltip, Select, Checkbox } from 'antd';
import { 
  ScanOutlined, 
  ArrowRightOutlined, 
  CheckCircleOutlined, 
  InfoCircleOutlined, 
  MonitorOutlined, 
  TabletOutlined, 
  MobileOutlined, 
  DeleteOutlined, 
  PlayCircleOutlined, 
  CloseCircleOutlined,
  SaveOutlined,
  HistoryOutlined
} from '@ant-design/icons';
import { apiClient } from '@/api/client';
import { useDeviceDetect } from '@/hooks/useDeviceDetect';

// 轉倉批次歷史紀錄型別
interface TransferItemLog {
  rollNo: string;
  materialName: string;
  fromStorage: string;
  toStorage: string;
  quantity: number;
}

interface TransferLog {
  timestamp: string;
  docNo: string;
  notes: string;
  itemCount: number;
  items: TransferItemLog[];
}

export const QuickRollTransfer: React.FC = () => {
  const { isMobile, isTablet, isPDA } = useDeviceDetect();
  const { message, modal } = App.useApp();

  // 暫存調撥單狀態
  const [activeTransfer, setActiveTransfer] = useState<any | null>(null);
  const [draftNotes, setDraftNotes] = useState<string>('');
  const [savingNotes, setSavingNotes] = useState<boolean>(false);

  // 掃描欄位狀態
  const [rollNo, setRollNo] = useState<string>('');
  const [targetStorage, setTargetStorage] = useState<string>('');
  const [itemNotes, setItemNotes] = useState<string>('');

  // 檢核狀態預覽
  const [rollInfo, setRollInfo] = useState<{ materialName: string; materialCode: string; currentStorage: string; areaSqm: number } | null>(null);
  const [storageInfo, setStorageInfo] = useState<{ name: string } | null>(null);

  // Loading 狀態
  const [loading, setLoading] = useState<boolean>(false);
  const [verifyingRoll, setVerifyingRoll] = useState<boolean>(false);


  // 本地調撥批次歷史紀錄 (本 session 完成的正式調撥)
  const [logs, setLogs] = useState<TransferLog[]>([]);

  // 儲位清單狀態與搜尋文字
  const [storages, setStorages] = useState<any[]>([]);
  const [searchText, setSearchText] = useState<string>('');
  const [isStorageLocked, setIsStorageLocked] = useState<boolean>(false);

  // 判斷原儲位與目的儲位是否相同 (用於同一儲位調撥的防呆禁用按鈕)
  const isSameStorage = !!(rollInfo && targetStorage && rollInfo.currentStorage === targetStorage);

  // DOM 節點引用，用於自動 Jump Focus 與全選
  const rollInputRef = useRef<any>(null);
  const storageInputRef = useRef<any>(null);
  const itemNotesInputRef = useRef<any>(null);

  // 1. 初始化或恢復暫存 session 與獲取儲位列表
  useEffect(() => {
    const fetchStorages = async () => {
      try {
        const res = await apiClient.get('/api/v1/Storage?pageSize=100');
        if (res.data?.success && res.data?.data?.data) {
          setStorages(res.data.data.data);
        } else if (res.data?.success && Array.isArray(res.data?.data)) {
          setStorages(res.data.data);
        }
      } catch (err) {
        console.error('Failed to fetch storages:', err);
      }
    };
    fetchStorages();

    const resumeSession = async () => {
      const savedDocNo = localStorage.getItem('quick_transfer_active_doc_no');
      if (savedDocNo) {
        try {
          setLoading(true);
          const res = await apiClient.get(`/api/v1/InventoryTransfer/${savedDocNo}`);
          if (res.data?.success && res.data?.data) {
            const doc = res.data.data;
            if (doc.status === 'Unconfirmed' || !doc.confirmDate) {
              setActiveTransfer(doc);
              setDraftNotes(doc.notes || '');
              message.info(`已恢復未完成的暫存調撥單：${savedDocNo}`);
            } else {
              localStorage.removeItem('quick_transfer_active_doc_no');
            }
          } else {
            localStorage.removeItem('quick_transfer_active_doc_no');
          }
        } catch {
          localStorage.removeItem('quick_transfer_active_doc_no');
        } finally {
          setLoading(false);
        }
      }
    };

    resumeSession();
  }, []);

  // 當 activeTransfer 變更且有輸入框時，自動 focus 到 LPN 欄位
  useEffect(() => {
    if (activeTransfer && rollInputRef.current) {
      setTimeout(() => {
        rollInputRef.current.focus();
      }, 100);
    }
  }, [activeTransfer]);

  // 代碼檢核：僅存大寫英數字符，禁中文，小寫自動轉大寫
  const sanitizeCodeInput = (val: string): string => {
    return val.toUpperCase().replace(/[\u4e00-\u9fa5]/g, '');
  };

  // 卷卡 LPN 變化監聽
  const handleRollNoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const cleanVal = sanitizeCodeInput(rawVal);
    setRollNo(cleanVal);

    if (cleanVal.length >= 6) {
      try {
        setVerifyingRoll(true);
        const res = await apiClient.get(`/api/v1/MaterialInventory/rolls?RollNo=${cleanVal}`);
        if (res.data?.success && res.data?.data?.data?.length > 0) {
          const item = res.data.data.data[0];
          
          setRollInfo({
            materialName: item.materialName,
            materialCode: item.materialCode,
            currentStorage: item.storageCode,
            areaSqm: (item.currentQtyAux * item.widthMm) / 1000,
          });

          // 檢查：來源儲位與目的儲位不能相同，跳出警告
          if (targetStorage && item.storageCode === targetStorage) {
            message.error(`卡卷 ${cleanVal} 目前已在目的儲位 ${targetStorage}，同儲位調撥沒有意義！`);
          }
        } else {
          setRollInfo(null);
        }
      } catch {
        setRollInfo(null);
      } finally {
        setVerifyingRoll(false);
      }
    } else {
      setRollInfo(null);
    }
  };

  // 篩選出所有原料儲位（排除原料總倉 TW-MAT-GEN）
  const filteredStorages = storages.filter(
    (s: any) => s.isDeleted === false && s.isActive === true && s.code.startsWith('TW-MAT-') && s.code !== 'TW-MAT-GEN'
  );

  // 目的儲位搜尋監聽（可接受掃碼、手動輸入與選擇）
  const handleStorageSearch = (val: string) => {
    const cleanVal = sanitizeCodeInput(val);
    setSearchText(cleanVal);

    // 支援條碼掃描與手動輸入，直接進行完全匹配或後綴匹配
    const matched = filteredStorages.find(
      s => s.code.toUpperCase() === cleanVal.toUpperCase() ||
           s.code.toUpperCase().replace('TW-MAT-', '') === cleanVal.toUpperCase()
    );

    if (matched) {
      setTargetStorage(matched.code);
      setStorageInfo({ name: matched.name });
    } else {
      if (cleanVal.length === 0) {
        setTargetStorage('');
        setStorageInfo(null);
      }
    }
  };

  // 儲位輸入框按下鍵盤事件（處理 Enter 輸入）
  const handleStorageInputKeyDown = (e: React.KeyboardEvent<any>) => {
    if (e.key === 'Enter') {
      let currentStorage = targetStorage;
      
      // 如果按 Enter 時還沒有完全匹配選中，試圖以當前搜尋框內容進行模糊匹配
      if (!currentStorage && searchText) {
        const matched = filteredStorages.find(
          s => s.code.toUpperCase().includes(searchText.toUpperCase()) ||
               s.name.toUpperCase().includes(searchText.toUpperCase())
        );
        if (matched) {
          currentStorage = matched.code;
          setTargetStorage(matched.code);
          setStorageInfo({ name: matched.name });
        }
      }

      if (!currentStorage) {
        message.warning('請指定目的儲位！');
        return;
      }

      // 如果有明細備註輸入框，跳轉至備註，否則直接提交新增
      if (itemNotesInputRef.current) {
        itemNotesInputRef.current.focus();
      } else {
        handleAddItemDirect(currentStorage);
      }
    }
  };

  // LPN 輸入框按下 Enter => 跳轉至儲位 Select 選擇器
  const handleRollKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (!rollNo) {
        message.warning('請先掃描或輸入卷卡號！');
        return;
      }
      if (storageInputRef.current) {
        storageInputRef.current.focus();
      }
    }
  };

  // 明細備註按下 Enter => 新增明細
  const handleItemNotesKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleAddItemDirect();
    }
  };

  // 2. 開始調撥作業 => 產生暫存原料調撥單頭
  const handleStartTransfer = async () => {
    try {
      setLoading(true);
      const todayStr = new Date().toISOString().split('T')[0];
      const res = await apiClient.post('/api/v1/InventoryTransfer', {
        documentDate: todayStr,
        notes: draftNotes.trim() || '快速轉倉批次調撥單',
        items: []
      });

      if (res.data?.success && res.data?.data) {
        const doc = res.data.data;
        setActiveTransfer(doc);
        setDraftNotes(doc.notes || '');
        localStorage.setItem('quick_transfer_active_doc_no', doc.documentNumber);
        message.success(`已產生暫存調撥單：${doc.documentNumber}`);
      } else {
        message.error(res.data?.message || '產生暫存調撥單失敗');
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || '網路或系統錯誤，無法產生暫存單。';
      message.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleStartTransferWithConfirm = () => {
    modal.confirm({
      title: '確認開始進行調撥作業？',
      icon: <InfoCircleOutlined className="text-blue-500" />,
      content: '開始此作業將會在系統中預先取得一筆唯一的正式庫存調撥單號。您確定要繼續並建單嗎？',
      okText: '確定開始',
      cancelText: '取消',
      okButtonProps: { className: 'bg-green-600 border-0' },
      onOk: async () => {
        await handleStartTransfer();
      }
    });
  };

  // 3. 自動/手動儲存表頭備註 (onBlur)
  const handleUpdateHeaderNotes = async (val: string) => {
    if (!activeTransfer) return;
    try {
      setSavingNotes(true);
      const res = await apiClient.put(`/api/v1/InventoryTransfer/${activeTransfer.documentNumber}`, {
        notes: val.trim()
      });
      if (res.data?.success) {
        // 同步更新本地狀態
        setActiveTransfer((prev: any) => prev ? { ...prev, notes: val.trim() } : null);
      }
    } catch (err: any) {
      console.error('儲存表頭備註失敗:', err);
    } finally {
      setSavingNotes(false);
    }
  };

  // 4. 新增暫存調撥明細 (每掃完一筆就呼叫 API 新增一筆)
  const handleAddItemDirect = async (overrideStorage?: string) => {
    if (!activeTransfer) {
      message.error('請先點擊「開始進行調撥作業」！');
      return;
    }
    const activeStorage = overrideStorage || targetStorage;
    if (!rollNo || !activeStorage) {
      message.error('卷卡號與目的儲位皆為必填！');
      return;
    }

    // 檢查是否已在現有明細中 (前端防呆)
    const exists = activeTransfer.items?.some(
      (item: any) => item.referenceNumber?.toUpperCase() === rollNo.toUpperCase()
    );
    if (exists) {
      message.warning(`卷卡 ${rollNo} 已在本批調撥明細中，請勿重複掃描！`);
      return;
    }

    if (rollInfo && rollInfo.currentStorage === activeStorage) {
      message.error('來源與目的儲位不能相同，同儲位的調撥沒有意義！');
      return;
    }

    try {
      setLoading(true);
      // 新增一筆明細
      const res = await apiClient.post(`/api/v1/InventoryTransfer/${activeTransfer.documentNumber}/items`, {
        inventoryType: 'M',
        inventoryCode: rollInfo?.materialCode || '',
        inventoryName: rollInfo?.materialName || '未知原料',
        quantity: rollInfo?.areaSqm || 0.0001,
        sourceStorageCode: rollInfo?.currentStorage || '',
        targetStorageCode: activeStorage,
        referenceNumber: rollNo,
        notes: itemNotes.trim()
      });

      if (res.data?.success) {
        message.success(`卷卡 ${rollNo} 成功加入清單`);

        // 重新拉取最新調撥單資料（確保同步明細）
        const docRes = await apiClient.get(`/api/v1/InventoryTransfer/${activeTransfer.documentNumber}`);
        if (docRes.data?.success && docRes.data?.data) {
          setActiveTransfer(docRes.data.data);
        }

        // 清除掃描欄位，並自動 focus 滾回 LPN 欄位
        setRollNo('');
        if (!isStorageLocked) {
          setTargetStorage('');
          setSearchText('');
          setStorageInfo(null);
        }
        setItemNotes('');
        setRollInfo(null);

        if (rollInputRef.current) {
          rollInputRef.current.focus();
        }
      } else {
        message.error(res.data?.message || '新增明細失敗');
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || '新增明細時發生錯誤。';
      message.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => handleAddItemDirect();

  // 5. 刪除明細 (行內點垃圾桶直接刪除，符合 "1.刪無confirm")
  const handleDeleteItem = async (lineNumber: string) => {
    if (!activeTransfer) return;
    try {
      setLoading(true);
      const res = await apiClient.delete(`/api/v1/InventoryTransfer/${activeTransfer.documentNumber}/items/${lineNumber}`);
      if (res.data?.success) {
        message.success('已刪除該筆明細');
        
        // 重新獲取最新狀態
        const docRes = await apiClient.get(`/api/v1/InventoryTransfer/${activeTransfer.documentNumber}`);
        if (docRes.data?.success && docRes.data?.data) {
          setActiveTransfer(docRes.data.data);
        }
      } else {
        message.error(res.data?.message || '刪除明細失敗');
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || '刪除明細時發生錯誤';
      message.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  // 6. 放棄此批調撥 (刪除暫存單主頭與明細，重置 session)
  const handleAbandonTransfer = async () => {
    if (!activeTransfer) return;
    try {
      setLoading(true);
      const res = await apiClient.delete(`/api/v1/InventoryTransfer/${activeTransfer.documentNumber}`);
      if (res.data?.success) {
        message.success('已放棄並刪除此暫存調撥單');
        
        // 清理狀態與 localStorage
        localStorage.removeItem('quick_transfer_active_doc_no');
        setActiveTransfer(null);
        setDraftNotes('');
        setRollNo('');
        setTargetStorage('');
        setItemNotes('');
        setRollInfo(null);
        setStorageInfo(null);
        setIsStorageLocked(false);
      } else {
        message.error(res.data?.message || '放棄調撥單失敗');
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || '放棄調撥時發生錯誤';
      message.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  // 7. 確認調撥 => 自動過帳確認，造成事實調撥
  const handleConfirmTransfer = async () => {
    if (!activeTransfer) return;
    if (!activeTransfer.items || activeTransfer.items.length === 0) {
      message.error('本批調撥無任何明細項目，不允許確認！');
      return;
    }

    try {
      setLoading(true);
      // 先儲存最新的備註內容
      await apiClient.put(`/api/v1/InventoryTransfer/${activeTransfer.documentNumber}`, {
        notes: draftNotes.trim()
      });

      // 執行確認過帳 API
      const res = await apiClient.post(`/api/v1/InventoryTransfer/${activeTransfer.documentNumber}/confirm`);
      if (res.data?.success) {
        message.success(`單據 ${activeTransfer.documentNumber} 已成功確認並過帳，完成調撥事實！`);

        // 將此批次加入本地 logs 紀錄中
        const newLog: TransferLog = {
          timestamp: new Date().toLocaleTimeString(),
          docNo: activeTransfer.documentNumber,
          notes: draftNotes.trim() || '無備註',
          itemCount: activeTransfer.items.length,
          items: activeTransfer.items.map((item: any) => ({
            rollNo: item.referenceNumber || '',
            materialName: item.inventoryName || '',
            fromStorage: item.sourceStorageCode || '',
            toStorage: item.targetStorageCode || '',
            quantity: item.quantity
          }))
        };
        setLogs([newLog, ...logs]);

        // 重置狀態與 localStorage
        localStorage.removeItem('quick_transfer_active_doc_no');
        setActiveTransfer(null);
        setDraftNotes('');
        setRollNo('');
        setTargetStorage('');
        setItemNotes('');
        setRollInfo(null);
        setStorageInfo(null);
        setIsStorageLocked(false);
      } else {
        message.error(res.data?.message || '調撥確認過帳失敗');
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || '確認調撥時發生錯誤';
      message.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  // 渲染設備標籤 (UI 狀態指示，讓現場管理員一目瞭然)
  const renderDeviceBadge = () => {
    if (isPDA) {
      return <Tag color="volcano" icon={<MobileOutlined />}>PDA 專屬手持模式</Tag>;
    }
    if (isMobile) {
      return <Tag color="magenta" icon={<MobileOutlined />}>手機極簡卡片版面</Tag>;
    }
    if (isTablet) {
      return <Tag color="cyan" icon={<TabletOutlined />}>平板舒適觸控版面</Tag>;
    }
    return <Tag color="blue" icon={<MonitorOutlined />}>桌上型高密版面</Tag>;
  };

  // === 響應式佈局渲染 ===

  // A. 手機/手持 PDA 模式
  if (isMobile || isPDA) {
    return (
      <div className="w-full h-full p-2 bg-gray-50 dark:bg-zinc-950 space-y-3">
        <Spin spinning={loading}>
          {!activeTransfer ? (
            // 手機版：初始狀態 - 開始調撥
            <Card 
              bordered={false}
              title={
                <div className="flex flex-col gap-1 items-start">
                  <span className="font-bold text-base">原料批次快速轉倉</span>
                  {renderDeviceBadge()}
                </div>
              }
              className="shadow-sm border-0 w-full"
            >
              <div className="space-y-4 py-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-500">本批調撥表頭備註 (選填)</label>
                  <Input.TextArea
                    rows={2}
                    placeholder="例如：廠內A區移到B區，或輸入特定備註"
                    value={draftNotes}
                    onChange={(e) => setDraftNotes(e.target.value)}
                    className="text-sm"
                    allowClear
                  />
                </div>
                <Button
                  type="primary"
                  onClick={handleStartTransferWithConfirm}
                  icon={<PlayCircleOutlined />}
                  className="w-full h-14 text-base font-bold bg-green-600 border-0 flex items-center justify-center gap-2"
                >
                  開始進行調撥作業
                </Button>
              </div>
            </Card>
          ) : (
            // 手機版：進行調撥狀態
            <div className="space-y-3">
              <Card 
                bordered={false}
                title={
                  <div className="flex flex-col gap-1 items-start">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base text-blue-600 font-mono">{activeTransfer.documentNumber}</span>
                      <Tag color="orange">暫存中</Tag>
                    </div>
                    {renderDeviceBadge()}
                  </div>
                }
                className="shadow-sm border-0 w-full"
              >
                <div className="space-y-4">
                  {/* LPN 欄位 */}
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-gray-500"><span className="text-red-500 mr-1">*</span>1. 掃描或輸入卡卷 LPN</span>
                    <Input
                      ref={rollInputRef}
                      prefix={<ScanOutlined />}
                      placeholder="掃描 LPN..."
                      value={rollNo}
                      onChange={handleRollNoChange}
                      onKeyDown={handleRollKeyDown}
                      onFocus={(e) => e.target.select()}
                      className="h-12 text-lg font-mono focus:shadow-[0_0_0_2px_rgba(24,144,255,0.2)]"
                      suffix={verifyingRoll ? <Spin size="small" /> : null}
                      allowClear
                    />
                    {rollInfo && (
                      <div className="p-2 bg-blue-50 dark:bg-blue-950/20 text-xs rounded border border-blue-200">
                        <div className="font-semibold text-blue-800 dark:text-blue-300 truncate">{rollInfo.materialName}</div>
                        <div className="mt-1 flex justify-between text-[11px] text-gray-500">
                          <span>原儲位: {rollInfo.currentStorage}</span>
                          <span className="font-bold text-green-600">{rollInfo.areaSqm.toFixed(2)} SQM</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 儲位欄位 */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-semibold text-gray-500"><span className="text-red-500 mr-1">*</span>2. 掃描或輸入目的儲位</span>
                      <Checkbox
                        disabled={!targetStorage}
                        checked={isStorageLocked}
                        onChange={(e) => setIsStorageLocked(e.target.checked)}
                        className="text-xs font-semibold text-zinc-400"
                      >
                        鎖定儲位
                      </Checkbox>
                    </div>
                    <Select
                      ref={storageInputRef}
                      disabled={isStorageLocked}
                      showSearch
                      allowClear
                      placeholder="掃描或選擇儲位..."
                      value={targetStorage || undefined}
                      onChange={(val: any) => {
                        setTargetStorage(val);
                        const matched = filteredStorages.find(s => s.code === val);
                        if (matched) {
                          setStorageInfo({ name: matched.name });
                        } else {
                          setStorageInfo(null);
                        }
                        setSearchText('');
                      }}
                      onSearch={handleStorageSearch}
                      onInputKeyDown={handleStorageInputKeyDown}
                      className="w-full text-base font-mono animate-focus"
                      size="large"
                      popupClassName="dark:bg-zinc-900"
                      filterOption={(input: string, option: any) =>
                        (option?.value ?? '').toString().toLowerCase().includes(input.toLowerCase()) ||
                        (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
                      }
                      options={filteredStorages.map(s => ({
                        value: s.code,
                        label: `${s.name} (${s.code})`,
                        disabled: rollInfo ? s.code === rollInfo.currentStorage : false
                      }))}
                      suffixIcon={<ArrowRightOutlined />}
                    />
                    {storageInfo && (
                      <div className="text-[11px] text-emerald-600 font-semibold px-1">
                        ✓ 儲位: {storageInfo.name}
                      </div>
                    )}
                  </div>

                  {/* 明細備註 */}
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-gray-500">3. 明細備註 (選填)</span>
                    <Input
                      ref={itemNotesInputRef}
                      placeholder="選填備註"
                      value={itemNotes}
                      onChange={(e) => setItemNotes(e.target.value)}
                      onKeyDown={handleItemNotesKeyDown}
                      className="h-10 text-sm"
                      allowClear
                    />
                  </div>

                  <Button
                    type="primary"
                    onClick={handleAddItem}
                    disabled={isSameStorage}
                    className="w-full h-12 text-sm font-bold bg-blue-600 border-0"
                  >
                    新增調撥明細(Enter)
                  </Button>
                </div>
              </Card>

              {/* 手機版：已掃描明細與表頭控制 */}
              <Card 
                bordered={false}
                title={
                  <div className="flex justify-between items-center w-full">
                    <span className="font-bold text-sm">本批已掃明細 ({activeTransfer.items?.length || 0} 筆)</span>
                    <Tooltip title="儲存備註">
                      <Button 
                        size="small" 
                        type="link" 
                        icon={<SaveOutlined />} 
                        loading={savingNotes}
                        onClick={() => handleUpdateHeaderNotes(draftNotes)}
                      >
                        儲存備註
                      </Button>
                    </Tooltip>
                  </div>
                }
                className="shadow-sm border-0 w-full"
              >
                <div className="space-y-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] text-gray-400">本批表頭備註：</span>
                    <Input
                      size="small"
                      placeholder="編輯表頭備註"
                      value={draftNotes}
                      onChange={(e) => setDraftNotes(e.target.value)}
                      onBlur={(e) => handleUpdateHeaderNotes(e.target.value)}
                      className="text-xs font-normal"
                      allowClear
                    />
                  </div>

                  {/* 簡化版列表 */}
                  <div className="max-h-60 overflow-y-auto space-y-1.5 border border-gray-100 dark:border-zinc-800 p-1.5 rounded bg-white dark:bg-zinc-900">
                    {(!activeTransfer.items || activeTransfer.items.length === 0) ? (
                      <div className="text-center py-6 text-gray-400 text-xs">尚無掃描明細，請開始掃描！</div>
                    ) : (
                      activeTransfer.items.map((item: any, idx: number) => (
                        <div key={item.lineNumber || idx} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-zinc-800/40 rounded text-xs">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-blue-600">{item.referenceNumber}</span>
                              <span className="text-gray-400 font-mono">[{item.sourceStorageCode}→{item.targetStorageCode}]</span>
                            </div>
                            <div className="text-[11px] text-gray-500 truncate">{item.inventoryName}</div>
                            {item.notes && <div className="text-[10px] text-orange-500 italic">備註: {item.notes}</div>}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-green-600">{Number(item.quantity).toFixed(2)} SQM</span>
                            <Button
                              type="text"
                              size="small"
                              danger
                              icon={<DeleteOutlined />}
                              onClick={() => handleDeleteItem(item.lineNumber)}
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* 底部控制鈕 - 符合 Save(L) / Cancel(R) 大按鈕 */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <Button
                      type="primary"
                      className="h-14 font-bold bg-green-600 border-0 flex items-center justify-center gap-1 text-sm"
                      onClick={handleConfirmTransfer}
                      icon={<CheckCircleOutlined />}
                      disabled={!activeTransfer.items || activeTransfer.items.length === 0}
                    >
                      確認產生調撥單
                    </Button>
                    <Popconfirm
                      title="確定要放棄並刪除這張暫存調撥單嗎？"
                      onConfirm={handleAbandonTransfer}
                      okText="確定"
                      cancelText="取消"
                      okButtonProps={{ danger: true }}
                    >
                      <Button
                        danger
                        className="h-14 font-bold flex items-center justify-center gap-1 text-sm"
                        icon={<CloseCircleOutlined />}
                      >
                        放棄此批調撥
                      </Button>
                    </Popconfirm>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </Spin>
      </div>
    );
  }

  // === B. 桌電 / 平板模式 (雙欄對稱 5:7 佈局) ===
  return (
    <div className="p-4 max-w-7xl mx-auto space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* 左側：掃描控制器 (佔 5 欄) */}
        <div className="lg:col-span-5 space-y-4">
          <Card 
            title={
              <div className="flex flex-col gap-1">
                <span className="font-bold text-lg">快速轉倉掃描器</span>
                <div>{renderDeviceBadge()}</div>
              </div>
            }
            className="shadow-sm border-0"
          >
            <Spin spinning={loading}>
              {!activeTransfer ? (
                // 初始狀態：顯示開始調撥作業
                <div className="py-8 text-center space-y-6">
                  <div className="text-gray-400 space-y-2">
                    <PlayCircleOutlined className="text-5xl text-green-500 animate-pulse" />
                    <div className="text-base font-bold text-gray-700 dark:text-gray-200">未開始批次調撥會話</div>
                    <p className="text-xs text-gray-400 max-w-sm mx-auto">
                      點擊下方按鈕將在資料庫中產生一筆「暫存調撥單」 (TR 類型)，後續所有掃描將自動寫入該單據明細，全部掃完後一鍵確認過帳，確保帳實一致。
                    </p>
                  </div>

                  <div className="text-left space-y-2 max-w-md mx-auto">
                    <label className="font-medium text-xs text-gray-500">設定此批調撥備註 (選填):</label>
                    <Input.TextArea
                      rows={3}
                      placeholder="可選填：輸入這批調撥的大致目的、特定工程單號或移轉原因..."
                      value={draftNotes}
                      onChange={(e) => setDraftNotes(e.target.value)}
                      allowClear
                    />
                  </div>

                  <Button
                    type="primary"
                    size="large"
                    icon={<PlayCircleOutlined />}
                    onClick={handleStartTransferWithConfirm}
                    className="w-full h-14 text-base font-bold bg-green-600 hover:bg-green-700 border-0"
                  >
                    開始進行調撥作業
                  </Button>
                </div>
              ) : (
                // 掃描進行狀態
                <div className="space-y-5">
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-md border border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
                    <div>
                      <div className="text-xs text-gray-400 font-medium">當前暫存調撥單號</div>
                      <div className="font-mono font-bold text-blue-600 text-base">{activeTransfer.documentNumber}</div>
                    </div>
                    <Tag color="orange" className="font-bold py-0.5 px-2">暫存中 (草稿)</Tag>
                  </div>

                  {/* LPN 欄位 */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-medium text-sm text-gray-700 dark:text-gray-300">
                      <span className="text-red-500 mr-1">*</span>1. 掃描或輸入卡卷 LPN:
                    </label>
                    <Input
                      ref={rollInputRef}
                      prefix={<ScanOutlined />}
                      placeholder="請掃描或輸入 LPN (自動轉大寫)"
                      value={rollNo}
                      onChange={handleRollNoChange}
                      onKeyDown={handleRollKeyDown}
                      onFocus={(e) => e.target.select()}
                      className="h-11 text-base font-mono focus:shadow-[0_0_0_2px_rgba(24,144,255,0.2)]"
                      suffix={verifyingRoll ? <Spin size="small" /> : null}
                      allowClear
                    />
                    {rollInfo && (
                      <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-md border border-blue-200 dark:border-blue-900/50 text-xs">
                        <div className="font-bold text-blue-800 dark:text-blue-300">{rollInfo.materialName}</div>
                        <div className="grid grid-cols-2 gap-1 mt-2 text-gray-500">
                          <div>料號: {rollInfo.materialCode}</div>
                          <div>在庫量: <span className="font-bold text-green-600">{rollInfo.areaSqm.toFixed(4)} SQM</span></div>
                          <div className="col-span-2">原儲位: <span className="font-bold text-orange-500">{rollInfo.currentStorage}</span></div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 儲位欄位 */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between w-full">
                      <label className="font-medium text-sm text-gray-700 dark:text-gray-300">
                        <span className="text-red-500 mr-1">*</span>2. 掃描或輸入目的儲位:
                      </label>
                      <Checkbox
                        disabled={!targetStorage}
                        checked={isStorageLocked}
                        onChange={(e) => setIsStorageLocked(e.target.checked)}
                        className="text-xs font-semibold text-zinc-400"
                      >
                        鎖定儲位
                      </Checkbox>
                    </div>
                    <Select
                      ref={storageInputRef}
                      disabled={isStorageLocked}
                      showSearch
                      allowClear
                      placeholder="請選擇或掃描目的儲位"
                      value={targetStorage || undefined}
                      onChange={(val: any) => {
                        setTargetStorage(val);
                        const matched = filteredStorages.find(s => s.code === val);
                        if (matched) {
                          setStorageInfo({ name: matched.name });
                        } else {
                          setStorageInfo(null);
                        }
                        setSearchText('');
                      }}
                      onSearch={handleStorageSearch}
                      onInputKeyDown={handleStorageInputKeyDown}
                      className="w-full text-base font-mono animate-focus"
                      size="large"
                      popupClassName="dark:bg-zinc-900"
                      filterOption={(input: string, option: any) =>
                        (option?.value ?? '').toString().toLowerCase().includes(input.toLowerCase()) ||
                        (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
                      }
                      options={filteredStorages.map(s => ({
                        value: s.code,
                        label: `${s.name} (${s.code})`,
                        disabled: rollInfo ? s.code === rollInfo.currentStorage : false
                      }))}
                      suffixIcon={<ArrowRightOutlined />}
                    />
                    {storageInfo && (
                      <div className="text-xs text-emerald-600 font-medium px-1">
                        ✓ 目的儲位: {storageInfo.name}
                      </div>
                    )}
                  </div>

                  {/* 明細備註欄位 */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-medium text-sm text-gray-700 dark:text-gray-300">3. 明細備註 (選填):</label>
                    <Input
                      ref={itemNotesInputRef}
                      placeholder="此卷之特定備註（按 Enter 直接提交新增）"
                      value={itemNotes}
                      onChange={(e) => setItemNotes(e.target.value)}
                      onKeyDown={handleItemNotesKeyDown}
                      className="h-10 text-sm"
                      allowClear
                    />
                  </div>

                  <div className="flex gap-4 pt-2">
                    <Button
                      type="primary"
                      size="large"
                      onClick={handleAddItem}
                      disabled={isSameStorage}
                      className="flex-1 h-12 text-sm font-bold bg-blue-600 hover:bg-blue-700 border-0"
                    >
                      新增調撥明細(Enter)
                    </Button>
                    <Button
                      size="large"
                      onClick={() => {
                        setRollNo('');
                        setTargetStorage('');
                        setItemNotes('');
                        setRollInfo(null);
                        setStorageInfo(null);
                        rollInputRef.current?.focus();
                      }}
                      className="w-1/3 h-12 text-sm"
                    >
                      重置輸入
                    </Button>
                  </div>

                  <hr className="border-gray-100 dark:border-zinc-800" />

                  {/* 下方 Session 控制大按鈕 (對稱設計且符合 Save(L) / Cancel(R)) */}
                  <div className="space-y-3">
                    <div className="text-xs font-semibold text-gray-400">本批次會話控制</div>
                    <div className="grid grid-cols-2 gap-4">
                      <Button
                        type="primary"
                        size="large"
                        icon={<CheckCircleOutlined />}
                        onClick={handleConfirmTransfer}
                        className="h-14 text-sm font-bold bg-green-600 hover:bg-green-700 border-0 flex items-center justify-center gap-1"
                        disabled={!activeTransfer.items || activeTransfer.items.length === 0}
                      >
                        確認產生調撥單 (L)
                      </Button>
                      
                      <Popconfirm
                        title="確認要放棄此批調撥作業嗎？"
                        description="放棄後，此暫存調撥單及其已掃描的明細會自資料庫被徹底刪除且無法恢復。"
                        onConfirm={handleAbandonTransfer}
                        okText="確定刪除"
                        cancelText="返回"
                        okButtonProps={{ danger: true }}
                      >
                        <Button
                          danger
                          size="large"
                          icon={<CloseCircleOutlined />}
                          className="h-14 text-sm font-bold flex items-center justify-center gap-1"
                        >
                          放棄此批調撥 (R)
                        </Button>
                      </Popconfirm>
                    </div>
                  </div>
                </div>
              )}
            </Spin>
          </Card>
        </div>

        {/* 右側：調撥明細與資訊 (佔 7 欄) */}
        <div className="lg:col-span-7">
          {!activeTransfer ? (
            // 初始狀態顯示：本 Session 調撥歷史紀錄
            <Card 
              title={
                <div className="flex justify-between items-center">
                  <span className="font-bold text-lg flex items-center gap-2">
                    <HistoryOutlined /> 本次快速轉倉作業歷史
                  </span>
                  <Badge count={logs.length} showZero color="#52c41a" />
                </div>
              }
              className="shadow-sm border-0 h-full min-h-[500px]"
            >
              {logs.length === 0 ? (
                <div className="text-center py-24 text-gray-400">
                  <InfoCircleOutlined className="text-4xl mb-4" />
                  <div className="text-base font-medium">本會話目前無轉倉紀錄</div>
                  <p className="text-xs text-gray-400 mt-1">請在左側點選「開始進行調撥作業」並進行連續掃描！</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {logs.map((log) => (
                    <Card 
                      key={log.docNo}
                      size="small"
                      type="inner"
                      title={
                        <div className="flex justify-between items-center text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-700 dark:text-gray-200">單號: </span>
                            <span className="font-mono font-bold text-blue-600">{log.docNo}</span>
                            <Tag color="success">已確認過帳</Tag>
                          </div>
                          <span className="text-gray-400">{log.timestamp}</span>
                        </div>
                      }
                      className="shadow-inner"
                    >
                      <div className="space-y-2 text-xs">
                        <div className="flex gap-2">
                          <span className="text-gray-400">備註: </span>
                          <span className="text-gray-600 dark:text-gray-300 font-normal">{log.notes || '無'}</span>
                        </div>
                        
                        <Table
                          dataSource={log.items}
                          rowKey="rollNo"
                          size="small"
                          pagination={false}
                          className="custom-table whitespace-nowrap"
                          bordered
                          scroll={{ x: 'max-content' }}
                        >
                          <Table.Column 
                            title="卷卡 LPN" 
                            dataIndex="rollNo" 
                            render={(text) => <span className="font-mono font-bold text-blue-600">{text}</span>} 
                          />
                          <Table.Column 
                            title="原料名稱" 
                            dataIndex="materialName" 
                            ellipsis={true} 
                          />
                          <Table.Column 
                            title="調撥儲位" 
                            render={(_, record: any) => (
                              <span>{record.fromStorage} <ArrowRightOutlined className="text-[10px] text-gray-300" /> <span className="text-emerald-600 font-bold">{record.toStorage}</span></span>
                            )} 
                          />
                          <Table.Column 
                            title="面積" 
                            dataIndex="quantity" 
                            align="right"
                            render={(text) => <span className="font-bold text-green-600">{Number(text).toFixed(4)} SQM</span>} 
                          />
                        </Table>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </Card>
          ) : (
            // 進行狀態顯示：當前暫存調撥單細節、表頭備註、表格
            <Card 
              title={
                <div className="flex justify-between items-center w-full">
                  <span className="font-bold text-lg flex items-center gap-2">
                    原料調撥暫存細節
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">本批共 </span>
                    <Badge count={activeTransfer.items?.length || 0} showZero color="#52c41a" />
                    <span className="text-xs text-gray-400"> 個項目</span>
                  </div>
                </div>
              }
              className="shadow-sm border-0 h-full min-h-[500px]"
            >
              <div className="space-y-5">
                {/* 顯示主檔資訊與可編輯的表頭備註 */}
                <div className="p-4 bg-zinc-50 dark:bg-zinc-900/60 rounded-md border border-zinc-200 dark:border-zinc-800/80 space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-gray-400">調撥單號：</span>
                      <span className="font-mono font-bold text-gray-700 dark:text-gray-200">{activeTransfer.documentNumber}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">建立日期：</span>
                      <span className="font-mono text-gray-700 dark:text-gray-200">{activeTransfer.documentDate}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">建立人員：</span>
                      <span className="text-gray-700 dark:text-gray-200">{activeTransfer.createdBy || '系統管理員'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">單據狀態：</span>
                      <span className="font-bold text-orange-500">草稿 (Unconfirmed)</span>
                    </div>
                  </div>

                  <hr className="border-zinc-100 dark:border-zinc-800" />

                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center">
                      <label className="font-semibold text-xs text-gray-500">本批調撥表頭備註 (可在這隨時修改，離開框自動儲存):</label>
                      {savingNotes && (
                        <span className="text-[10px] text-blue-500 flex items-center gap-1">
                          <Spin size="small" /> 儲存中...
                        </span>
                      )}
                    </div>
                    <Input.TextArea
                      rows={2}
                      placeholder="點擊輸入這整批調撥的說明備註（例如：製令補料、現場庫房整理調撥）"
                      value={draftNotes}
                      onChange={(e) => setDraftNotes(e.target.value)}
                      onBlur={(e) => handleUpdateHeaderNotes(e.target.value)}
                      className="text-xs"
                      allowClear
                    />
                  </div>
                </div>

                {/* 明細列表 */}
                <div className="space-y-2">
                  <div className="font-semibold text-sm text-gray-700 dark:text-gray-200">本批已掃描明細清單:</div>
                  
                  <Table 
                    dataSource={activeTransfer.items || []} 
                    rowKey="lineNumber"
                    size="small"
                    pagination={{ pageSize: 6 }}
                    className="custom-table whitespace-nowrap"
                    bordered
                    locale={{ emptyText: '本批調撥尚未掃描任何卷卡，請在左側輸入！' }}
                    scroll={{ x: 'max-content' }}
                  >
                    <Table.Column 
                      title="操作" 
                      width="60px"
                      align="center"
                      fixed="left"
                      render={(_, record: any) => (
                        <Button
                          type="text"
                          danger
                          size="small"
                          icon={<DeleteOutlined />}
                          onClick={() => handleDeleteItem(record.lineNumber)}
                          title="刪除"
                        />
                      )} 
                    />
                    <Table.Column 
                      title="項次" 
                      width="50px"
                      align="center"
                      render={(_, __, idx) => idx + 1} 
                    />
                    <Table.Column 
                      title="卷卡 LPN" 
                      dataIndex="referenceNumber" 
                      width="130px"
                      render={(text) => <span className="font-mono font-bold text-blue-600">{text}</span>} 
                    />
                    <Table.Column 
                      title="原料品名規格" 
                      dataIndex="inventoryName" 
                      ellipsis={true} 
                    />
                    <Table.Column 
                      title="原儲位" 
                      dataIndex="sourceStorageCode" 
                      width="80px"
                      align="center"
                    />
                    <Table.Column 
                      title="新儲位" 
                      dataIndex="targetStorageCode" 
                      width="80px"
                      align="center"
                      render={(text) => <span className="text-emerald-600 font-bold">{text}</span>} 
                    />
                    <Table.Column 
                      title="調撥面積" 
                      dataIndex="quantity" 
                      width="110px"
                      align="right"
                      render={(text) => <span className="text-green-600 font-mono font-bold">{Number(text).toFixed(4)} SQM</span>} 
                    />
                    <Table.Column 
                      title="明細備註" 
                      dataIndex="notes" 
                      ellipsis={true}
                    />

                  </Table>
                </div>
              </div>
            </Card>
          )}
        </div>

      </div>
    </div>
  );
};
