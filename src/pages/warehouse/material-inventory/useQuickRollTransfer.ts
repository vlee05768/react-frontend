import React, { useState, useRef, useEffect } from 'react';
import { App } from 'antd';
import { apiClient } from '@/api/client';
import { useDeviceDetect } from '@/hooks/useDeviceDetect';
import { useErpConfigStore } from '@/stores/useErpConfigStore';

// 轉倉批次歷史紀錄型別
export interface TransferItemLog {
  rollNo: string;
  materialName: string;
  fromStorage: string;
  toStorage: string;
  quantity: number;
}

export interface TransferLog {
  timestamp: string;
  docNo: string;
  notes: string;
  itemCount: number;
  items: TransferItemLog[];
}

export interface RollInfo {
  materialName: string;
  materialCode: string;
  currentStorage: string;
  areaSqm: number;
}

export const useQuickRollTransfer = () => {
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
  const [rollInfo, setRollInfo] = useState<RollInfo | null>(null);
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

  // DOM 節點引用，用於自動 Jump Focus 與全選
  const rollInputRef = useRef<any>(null);
  const storageInputRef = useRef<any>(null);
  const itemNotesInputRef = useRef<any>(null);

  // 判斷原儲位與目的儲位是否相同 (用於同一儲位調撥的防呆禁用按鈕)
  const isSameStorage = !!(rollInfo && targetStorage && rollInfo.currentStorage === targetStorage);

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

  // 當 activeTransfer 變更且有輸入框時，自動 focus 到 LPN 欄位 (根據 YAML 設定)
  useEffect(() => {
    const autoFocusEnabled = useErpConfigStore.getState().getAutoFocusLpn();
    if (autoFocusEnabled && activeTransfer && rollInputRef.current) {
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

        const autoFocusEnabled = useErpConfigStore.getState().getAutoFocusLpn();
        if (autoFocusEnabled && rollInputRef.current) {
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

  return {
    isMobile,
    isTablet,
    isPDA,
    activeTransfer,
    draftNotes,
    savingNotes,
    rollNo,
    targetStorage,
    itemNotes,
    rollInfo,
    storageInfo,
    loading,
    verifyingRoll,
    logs,
    storages,
    searchText,
    isStorageLocked,
    isSameStorage,
    filteredStorages,
    rollInputRef,
    storageInputRef,
    itemNotesInputRef,
    setDraftNotes,
    setItemNotes,
    setIsStorageLocked,
    setTargetStorage,
    setSearchText,
    setStorageInfo,
    handleRollNoChange,
    handleRollKeyDown,
    handleStorageSearch,
    handleStorageInputKeyDown,
    handleItemNotesKeyDown,
    handleStartTransferWithConfirm,
    handleUpdateHeaderNotes,
    handleAddItem,
    handleDeleteItem,
    handleAbandonTransfer,
    handleConfirmTransfer
  };
};
