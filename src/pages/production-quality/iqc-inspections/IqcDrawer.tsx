// @ts-nocheck
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Drawer, Card, Table, InputNumber, Radio, Select, Button, Tag, Space, Form, Input, Typography, Divider, Badge, Alert, Row, Col, message, Spin, Modal } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, ExclamationCircleOutlined, SaveOutlined, WarningOutlined, ArrowRightOutlined, FilePdfOutlined, AuditOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getApiV1IqcInspectionByIqcRecordId, postApiV1IqcInspectionByIqcRecordIdEscalate, postApiV1IqcInspectionByIqcRecordIdComplete, getApiV1IqcInspectionByIqcRecordIdPdf } from '@/api/generated';
import { useFileDownload } from '@/hooks/useFileDownload';
import { AsyncSelect } from '@/components/Form/AsyncSelect';
import { useAuthStore } from '@/stores/useAuthStore';
import { client } from '@/api/generated/client.gen';
import { DynamicForm } from '@/components/Form/DynamicForm';

const { Title, Text } = Typography;

interface MeasuredInputProps {
  rollNo: string;
  itemCode: string;
  initialValue: string | null;
  isReadOnly: boolean;
  onChange: (rollNo: string, itemCode: string, value: string) => void;
  isText?: boolean;
}

const MeasuredInput = React.memo(({ rollNo, itemCode, initialValue, isReadOnly, onChange, isText }: MeasuredInputProps) => {
  const [val, setVal] = useState(initialValue || '');

  useEffect(() => {
    setVal(initialValue || '');
  }, [initialValue]);

  const handleBlur = () => {
    if (val !== (initialValue || '')) {
      onChange(rollNo, itemCode, val);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  return (
    <Input 
      placeholder="實測值" 
      value={val}
      disabled={isReadOnly}
      className={`${isText ? "w-full min-w-[180px] text-left px-3" : "w-32 text-center"} focus:ring-2 focus:ring-blue-400 focus:outline-none rounded`}
      onFocus={(e) => e.target.select()}
      onChange={(e) => setVal(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
    />
  );
});
MeasuredInput.displayName = 'MeasuredInput';

interface IqcDrawerProps {
  iqcRecordId: string | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function IqcDrawer({ iqcRecordId, open, onClose, onSuccess }: IqcDrawerProps) {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [rolls, setRolls] = useState<any[]>([]);
  const [overallResult, setOverallResult] = useState<'AllPass' | 'Concession' | 'Reject'>('AllPass');
  const [inspectorId, setInspectorId] = useState('');
  const [notes, setNotes] = useState('');
  const [responsibleParty, setResponsibleParty] = useState('');
  const [incomingStorageCode, setIncomingStorageCode] = useState('');
  const [samplingPercent, setSamplingPercent] = useState<number>(30); // 預設 30%
  const [isCustomPercent, setIsCustomPercent] = useState<boolean>(false);

  // 💡 UX控制彈窗狀態
  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  const { downloadFile, isDownloading } = useFileDownload();

  const handlePrintPdf = () => {
    if (!iqcRecordId) return;
    downloadFile({
      apiFunction: () => getApiV1IqcInspectionByIqcRecordIdPdf({ 
        path: { iqcRecordId },
        responseType: 'blob'
      }),
      successMessage: '品質檢驗報告 PDF 導出成功！',
      filename: `IQC-${iqcRecordId}.pdf`,
      openInNewTab: true
    });
  };

  const handlePrintConcessionPdf = () => {
    if (!iqcRecordId) return;
    downloadFile({
      apiFunction: () => client.get({ 
        url: `/api/v1/IqcInspection/${iqcRecordId}/concession-pdf`,
        responseType: 'blob'
      }),
      successMessage: '特採申請單 PDF 導出成功！',
      filename: `CONCESSION-${iqcRecordId}.pdf`,
      openInNewTab: true
    });
  };

  const [localStatus, setLocalStatus] = useState<string | null>(null);

  // 1. 取得品檢單詳情
  const { data: response, isLoading, refetch } = useQuery({
    queryKey: ['iqc-detail', iqcRecordId],
    queryFn: () => getApiV1IqcInspectionByIqcRecordId({ path: { iqcRecordId: iqcRecordId! } }),
    enabled: !!iqcRecordId && open,
  });

  const detail = response?.data?.data;
  const currentStatus = localStatus || detail?.inspectionStatus || 'Pending';
  const isReadOnly = currentStatus !== 'Pending' && currentStatus !== 'FullInspecting';
  const isRollMaterial = detail?.materialForm === 'R'; // R=捲材, S=片材

  const sampleCount = isReadOnly 
    ? (detail?.sampleSize || rolls.length)
    : (currentStatus === 'FullInspecting'
        ? detail?.rollCount 
        : Math.min(detail?.rollCount || 1, Math.max(1, Math.ceil(((detail?.rollCount || 0) * samplingPercent) / 100))));

  const unitLabel = isRollMaterial ? '卷' : 'pcs';

  // 當資料載入時，初始化 rolls
  useEffect(() => {
    if (detail?.rolls) {
      setLocalStatus(null); // 💡 當資料載入時，清除本地 overrides 狀態
      const initialRolls = detail.rolls.map((r: any) => ({
        ...r,
        actualQtyAux: r.actualQtyAux,
        isOk: r.isOk, // 💡 嚴格讀取資料庫狀態，不判定預設 true！未檢驗時為 null
        measuredThicknessMm: r.measuredThicknessMm ?? detail.standardThickness ?? 0.0500,
        measuredCoreDiaMm: r.measuredCoreDiaMm ?? (isRollMaterial ? 76.20 : null),
        lengthMm: r.lengthMm ?? (isRollMaterial ? null : detail.standardLength),
        disposition: r.disposition || 'Concession',
        responsibleParty: r.responsibleParty || detail.supplierCode,
        inspectionItems: r.inspectionItems || []
      }));
      setRolls(initialRolls);
      
      const defaultInspector = (detail.inspectorId === 'PENDING' || !detail.inspectorId)
        ? (user?.employeeCode || '')
        : detail.inspectorId;
      setInspectorId(defaultInspector);

      if (detail.inspectionStatus === 'FullInspecting') {
        setSamplingPercent(100);
        setIsCustomPercent(false);
      } else {
        if (detail.inspectionStatus !== 'Pending') {
          const pct = Math.round((detail.rolls.length / detail.rollCount) * 100);
          setSamplingPercent(pct);
        } else {
          setSamplingPercent(isRollMaterial ? 30 : 1);
        }
      }

      setNotes(detail.notes || "");
      setResponsibleParty(detail.responsibleParty || "");
      setIncomingStorageCode(detail.incomingStorageCode || "");

      const defResult = detail.inspectionStatus === 'Pending' 
        ? 'AllPass' 
        : (detail.inspectionStatus === 'Reject' ? 'Reject' : (detail.inspectionStatus?.startsWith('Concession') ? 'Concession' : 'AllPass'));
      setOverallResult(defResult);
    }
  }, [detail, isRollMaterial, user]);

  // 💡 確保片材/捲材的 rolls 狀態長度至少與當前算出的 sampleCount 一致 (不足則進行動態 Pad 填充明細行)
  useEffect(() => {
    if (detail && !isReadOnly && rolls.length > 0 && rolls.length < sampleCount) {
      const templateRoll = rolls[0] || {
        measuredThicknessMm: detail.standardThickness ?? 0.05,
        measuredCoreDiaMm: null,
        lengthMm: detail.standardLength,
        isOk: null,
        disposition: 'Concession',
        responsibleParty: detail.supplierCode,
        inspectionItems: detail.rolls?.[0]?.inspectionItems || []
      };
      
      const newRolls = [...rolls];
      for (let i = rolls.length + 1; i <= sampleCount; i++) {
        const rollNo = isRollMaterial 
          ? `${detail.lotNo}-R${i.toString().padStart(2, '0')}`
          : `${detail.lotNo}-S${i.toString().padStart(2, '0')}`;
        newRolls.push({
          seq: i,
          rollNo: rollNo,
          actualQtyAux: isRollMaterial ? detail.standardLength : 1, // 片材單張樣品為 1 pcs
          isOk: true, // 💡 預設通過
          measuredThicknessMm: templateRoll.measuredThicknessMm,
          measuredCoreDiaMm: templateRoll.measuredCoreDiaMm,
          lengthMm: templateRoll.lengthMm,
          disposition: templateRoll.disposition,
          responsibleParty: templateRoll.responsibleParty,
          inspectionItems: (templateRoll.inspectionItems || []).map((item: any) => ({
            ...item,
            measuredValue: '',
            isOk: true // 💡 預設項目通過
          }))
        });
      }
      setRolls(newRolls);
    }
  }, [sampleCount, detail, isRollMaterial, rolls.length, isReadOnly]);

  // 2. 升級加嚴 100% 全檢之 Mutation
  const escalateMutation = useMutation({
    mutationFn: () => postApiV1IqcInspectionByIqcRecordIdEscalate({ path: { iqcRecordId: iqcRecordId! } }),
    onSuccess: () => {
      message.success('已成功將品檢單解鎖並升級為加嚴 100% 全檢狀態！請務必填寫所有卷卡數據！');
      refetch();
    },
    onError: (err: any) => message.error(err.response?.data?.message || '升級全檢失敗'),
  });

  // 3. 品檢結案最終過帳之 Mutation
  const completeMutation = useMutation({
    mutationFn: (payload: any) => postApiV1IqcInspectionByIqcRecordIdComplete({
      path: { iqcRecordId: iqcRecordId! },
      body: payload
    }),
    onSuccess: () => {
      setIsDecisionModalOpen(false);
      if (overallResult === 'Concession') {
        message.success('已成功提交特採申請並送交會簽中！狀態已更新為【特採審核中】。');
      } else {
        message.success('品質檢驗過帳完成！良品已正式產生 LPN 卷卡入庫。');
      }
      onSuccess();
    },
    onError: (err: any) => message.error(err.response?.data?.message || '過帳失敗，請重試'),
  });

  // 4. 特採審核主管核准/拒絕 Mutations
  const approveConcessionMutation = useMutation({
    mutationFn: (notes: string) => client.post({
      url: `/api/v1/IqcInspection/${iqcRecordId}/concession/approve`,
      body: { notes }
    }),
    onSuccess: () => {
      setIsReviewModalOpen(false);
      message.success('特採核准過帳成功！全數卷料已正式建立 LPN 庫存卡並過帳至正式原料倉。');
      onSuccess();
    },
    onError: (err: any) => message.error(err.response?.data?.message || '核准特採失敗'),
  });

  const rejectConcessionMutation = useMutation({
    mutationFn: (notes: string) => client.post({
      url: `/api/v1/IqcInspection/${iqcRecordId}/concession/reject`,
      body: { notes }
    }),
    onSuccess: () => {
      setIsReviewModalOpen(false);
      message.success('特採申請已被拒絕！此批到貨全數退回拒收，採購量已完成全額回彈扣減。');
      onSuccess();
    },
    onError: (err: any) => message.error(err.response?.data?.message || '拒絕特採失敗'),
  });

  // 5. 事件處理器 (智慧項目連動，整卷只有一個 OK/NG 判定按鈕)
  const handleMeasuredItemValueChange = useCallback((rollNo: string, itemCode: string, value: string) => {
    if (isReadOnly) return;
    setRolls(prevRolls => prevRolls.map(r => {
      if (r.rollNo === rollNo) {
        const updatedItems = r.inspectionItems.map((i: any) => {
          if (i.itemCode === itemCode) {
            return { ...i, measuredValue: value };
          }
          return i;
        });
        return { ...r, inspectionItems: updatedItems };
      }
      return r;
    }));
  }, [isReadOnly]);

  const handleStatusChange = useCallback((rollNo: string, isOk: boolean) => {
    if (isReadOnly) return;
    setRolls(prevRolls => {
      const updated = prevRolls.map((r) => {
        if (r.rollNo === rollNo) {
          return {
            ...r,
            isOk,
            disposition: isOk ? undefined : "Concession",
            responsibleParty: isOk ? undefined : detail?.supplierCode,
            // 智慧連動：將此卷下所有動態品質項目的 isOk 同步為此卷的判定狀態
            inspectionItems: r.inspectionItems.map((i: any) => ({ ...i, isOk }))
          };
        }
        return r;
      });

      const hasNg = updated.some((r) => r.isOk === false);
      setOverallResult(hasNg ? "Concession" : "AllPass");
      return updated;
    });
  }, [isReadOnly, detail?.supplierCode]);

  // 3.5 重置為待檢驗狀態之 Mutation (真正呼叫後端 API 進行資料庫清空重置)
  const resetMutation = useMutation({
    mutationFn: () => client.post({
      url: `/api/v1/IqcInspection/${iqcRecordId}/reset`
    }),
    onSuccess: () => {
      message.success('已成功將此品檢單恢復為全新的待檢驗狀態！');
      setLocalStatus('Pending');
      setSamplingPercent(isRollMaterial ? 30 : 1);
      setIsCustomPercent(false);
      refetch();
    },
    onError: (err: any) => message.error(err.response?.data?.message || '重置待檢驗失敗'),
  });

  const handleResetToPending = () => {
    if (!detail) return;
    Modal.confirm({
      title: '確認恢復為待檢驗狀態',
      icon: <ExclamationCircleOutlined className="text-amber-500" />,
      content: '確定要清除當前填寫的所有實測數據，並呼叫 API 將資料庫中此品檢單恢復為全新的【待檢驗】狀態（同時解鎖並重設抽樣比例為預設 30%）嗎？',
      okText: '確認恢復',
      cancelText: '取消',
      onOk: () => {
        resetMutation.mutate();
      }
    });
  };

  // 💡 取消過帳並還原庫存之 Mutation (呼叫後端 API 撤銷判定與沖銷庫存)
  const cancelMutation = useMutation({
    mutationFn: (notes: string) => client.post({
      url: `/api/v1/IqcInspection/${iqcRecordId}/cancel`,
      body: { notes }
    }),
    onSuccess: () => {
      message.success('已成功取消此品檢單過帳判定，並順利註銷 LPN 與還原庫存量！');
      setLocalStatus('Pending');
      refetch();
      if (onSuccess) onSuccess();
    },
    onError: (err: any) => {
      const errMsg = err.response?.data?.message || err.message || '取消過帳失敗';
      Modal.error({
        title: '撤銷過帳失敗 (ERP 剛性業務鎖定)',
        content: errMsg,
        okText: '確認',
      });
    },
  });

  const handleCancelPosting = () => {
    if (!detail) return;
    
    let notesValue = '';
    
    Modal.confirm({
      title: '⚠️ 確認取消品檢單過帳？',
      icon: <WarningOutlined className="text-red-500" />,
      content: (
        <div className="space-y-2 mt-2">
          <p className="text-red-500 font-bold text-sm">此為 ERP 庫存與帳務沖銷之高風險操作！</p>
          <div className="text-xs text-slate-500 space-y-1">
            <p>系統將執行以下剛性沖銷：</p>
            <p>1. 註銷這批單據產生的全部實物 LPN 卷卡。</p>
            <p>2. 扣減已增加的可用邏輯庫存量。</p>
            <p>3. 刪除相關庫存交易流水帳。</p>
            <p>4. 若為不合格退貨，將還原（累加回）採購單已到貨量。</p>
            <p>5. 將單據狀態重置回 Pending（待檢驗）。</p>
          </div>
          <p className="text-xs text-red-500 font-semibold mt-2">
            ※ 注意：若此批中任何卷卡已在車間投產（WIP）或被消耗，系統將自動拒絕此操作！
          </p>
          <div className="mt-4">
            <span className="text-xs text-slate-600 block mb-1">請輸入取消過帳原因/理由：</span>
            <Input.TextArea
              placeholder="請輸入取消理由，如：輸入數據錯誤，需退回重新檢驗錄入..."
              onChange={(e) => { notesValue = e.target.value; }}
              rows={3}
            />
          </div>
        </div>
      ),
      okText: '確認取消過帳',
      okButtonProps: { danger: true },
      cancelText: '放棄',
      onOk: () => {
        cancelMutation.mutate(notesValue);
      }
    });
  };

  const handleProceedToPosting = () => {
    // 💡 觸發 Form 的 validation，會自動檢核必填與格式
    const submitBtn = document.getElementById('iqcBasicForm-submit-btn');
    if (submitBtn) {
      submitBtn.click();
    }
  };

  const displayedRolls = isReadOnly 
    ? rolls 
    : rolls.slice(0, sampleCount);

  const handleSubmit = () => {
    if (!inspectorId) {
      message.warning('請輸入品檢人員員工工號');
      return;
    }

    if (!incomingStorageCode) {
      message.warning('請選擇入庫儲位');
      return;
    }

    const hasNg = displayedRolls.some(r => r.isOk === false);
    if (hasNg && overallResult === 'AllPass') {
      message.warning('明細中存有異常卷料，判定結果不可為 AllPass (全部通過)！');
      return;
    }

    if (!hasNg && overallResult === 'Concession') {
      message.warning('明細中無異常不良品，不可申請特採！請選擇 AllPass (全部通過)。');
      return;
    }

    // 剛性檢核：若為特採 Concession，必須為 100% 全檢 (也就是 displayedRolls.length === detail.rollCount)
    if (overallResult === 'Concession' && displayedRolls.length < detail?.rollCount) {
      message.error('依 ISO 規範，若有不良品欲申請特採，必須先將剩下未檢驗的卷料全部檢驗完成！請先啟動「100% 全檢」！');
      return;
    }

    // 組裝過帳 Payloads
    const payload = {
      overallResult,
      inspectorId: inspectorId.toUpperCase(),
      responsibleParty: overallResult !== 'AllPass' ? (responsibleParty || detail?.supplierCode) : undefined,
      notes,
      incomingStorageCode: incomingStorageCode || undefined,
      sampleSize: sampleCount, // 💡 同步將計算出的抽樣數回寫至資料庫
      rolls: displayedRolls.map(r => ({
        seq: r.seq,
        rollNo: r.rollNo,
        actualQtyAux: r.actualQtyAux,
        isOk: r.isOk,
        measuredThicknessMm: r.measuredThicknessMm,
        measuredCoreDiaMm: r.measuredCoreDiaMm,
        lengthMm: r.lengthMm,
        disposition: r.isOk ? undefined : r.disposition,
        responsibleParty: r.isOk ? undefined : r.responsibleParty,
        inspectionItems: r.inspectionItems.map((i: any) => ({
          itemCode: i.itemCode,
          itemName: i.itemName,
          specification: i.specification,
          measuredValue: i.measuredValue || '',
          isOk: i.isOk
        }))
      }))
    };

    completeMutation.mutate(payload);
  };

  // 5. 數據與看板計算
  const totalInspected = displayedRolls.filter(r => r.isOk !== null && r.isOk !== undefined).length;
  const okCount = displayedRolls.filter(r => r.isOk === true).length;
  const ngCount = displayedRolls.filter(r => r.isOk === false).length;

  const fields = [
    {
      name: 'iqcRecordId',
      label: '品檢單號',
      componentType: 'Input',
      editable: 'never',
      colSpan: 4,
    },
    {
      name: 'sourceDocNumber',
      label: '來源進貨單號',
      componentType: 'Input',
      editable: 'never',
      colSpan: 4,
    },
    {
      name: 'poLineNumber',
      label: '關聯採購項次',
      componentType: 'Input',
      editable: 'never',
      colSpan: 4,
    },
    {
      name: 'lotNo',
      label: '批次代碼',
      componentType: 'Input',
      editable: 'never',
      colSpan: 4,
    },
    {
      name: "supplierCode",
      label: "供應商",
      componentType: "Custom",
      colSpan: 4,
      customRender: () => (
        <div className="flex items-center h-[32px]">
          <Text className="text-[var(--ant-color-text)] font-semibold">
            [{detail?.supplierCode}] {detail?.supplierName}
          </Text>
        </div>
      ),
    },
    {
      name: 'materialCode',
      label: '物料編碼',
      componentType: 'Input',
      editable: 'never',
      colSpan: 4,
    },
    {
      name: 'materialName',
      label: '物料名稱',
      componentType: 'Input',
      editable: 'never',
      colSpan: 4,
    },
    {
      name: 'inspectorId',
      label: '品檢人員工代碼',
      componentType: 'Custom',
      colSpan: 4,
      required: true,
      customRender: (props: any) => (
        <AsyncSelect 
          configKey="EMPLOYEE"
          placeholder="請選擇或搜尋員工" 
          value={props.value || inspectorId} 
          disabled={isReadOnly}
          className="w-full focus:ring-2 focus:ring-blue-400 focus:outline-none"
          onChange={(val) => {
            setInspectorId(val);
            props.onChange(val);
          }} 
        />
      )
    },
    {
      name: 'incomingStorageCode',
      label: '入庫儲位',
      componentType: 'Custom',
      colSpan: 4,
      required: true,
      customRender: (props: any) => (
        <AsyncSelect 
          configKey="STORAGE"
          placeholder="請選擇入庫儲位" 
          value={props.value || incomingStorageCode} 
          disabled={isReadOnly}
          className="w-full focus:ring-2 focus:ring-blue-400 focus:outline-none"
          onChange={(val) => {
            setIncomingStorageCode(val || '');
            props.onChange(val || '');
          }} 
          allowClear
        />
      )
    },
    {
      name: 'materialForm',
      label: '材料型態',
      componentType: 'Select',
      editable: 'never',
      colSpan: 6,
      componentProps: {
        options: [
          { label: '捲材 (Coil)', value: 'R' },
          { label: '片材 (Sheet)', value: 'S' }
        ]
      }
    },
    {
      name: 'standardThickness',
      label: '標準厚度 (mm)',
      componentType: 'InputNumber',
      editable: 'never',
      colSpan: 6,
    },
    {
      name: 'standardWidth',
      label: '標準寬度 (mm)',
      componentType: 'InputNumber',
      editable: 'never',
      colSpan: 6,
    },
    {
      name: 'standardLength',
      label: isRollMaterial ? '標準長度 (M)' : '標準長度 (mm)',
      componentType: 'InputNumber',
      editable: 'never',
      colSpan: 6,
    },
    {
      name: 'rollCount',
      label: isRollMaterial ? '到貨總卷數' : '數量',
      componentType: 'InputNumber',
      editable: 'never',
      colSpan: 6,
    },
  ];

  const defaultValues = {
    iqcRecordId: detail?.iqcRecordId,
    sourceDocNumber: detail?.sourceDocNumber,
    lotNo: detail?.lotNo,
    supplierCode: detail?.supplierCode,
    materialCode: detail?.materialCode,
    materialName: detail?.materialName,
    rollCount: detail?.rollCount,
    inspectorId: inspectorId,
    materialForm: detail?.materialForm,
    standardThickness: detail?.standardThickness || 0.05,
    standardWidth: detail?.standardWidth,
    standardLength: detail?.standardLength,
    poLineNumber: detail?.poLineNumber,
    incomingStorageCode: incomingStorageCode
  };

  // 💡 動態依範本產生檢驗項目欄位，將實測值直接行內顯示 (不帶 OK/NG 按鈕，按鈕獨立在檢驗判定列)
  const templateItems = useMemo(() => {
    return detail?.rolls?.[0]?.inspectionItems || [];
  }, [detail]);
  
  const columns = useMemo(() => {
    const dynamicColumns = templateItems.map((item: any) => ({
      title: `${item.itemName} (${item.specification})`,
      key: `item_${item.itemCode}`,
      align: (item.itemCode === 'appearance' ? 'left' : 'center') as const,
      width: item.itemCode === 'appearance' ? 220 : 130,
      render: (_: any, record: any) => {
        const rollItem = record.inspectionItems?.find((i: any) => i.itemCode === item.itemCode);
        if (!rollItem) return '-';
        return (
          <MeasuredInput 
            rollNo={record.rollNo}
            itemCode={item.itemCode}
            initialValue={rollItem.measuredValue}
            isReadOnly={isReadOnly}
            onChange={handleMeasuredItemValueChange}
            isText={item.itemCode === 'appearance'}
          />
        );
      }
    }));

    return [
      {
        title: "流水號",
        dataIndex: "seq",
        key: "seq",
        width: 100,
        align: 'center' as const,
        render: (seq: number, record: any) => {
          const isAutoApproved = isReadOnly && detail?.sampleSize && record.seq > detail.sampleSize;
          return (
            <Space>
              <Badge status={isAutoApproved ? "default" : (record.isOk ? "success" : "error")} />
              <Text strong={!record.isOk} className={record.isOk ? "text-slate-700" : "text-red-500 font-bold"}>
                {seq}
              </Text>
              {isAutoApproved && <Tag color="default">免檢</Tag>}
            </Space>
          );
        }
      },
      ...dynamicColumns,
      {
        title: "檢驗判定",
        key: "isOk",
        width: 180,
        align: 'center' as const,
        render: (_: any, record: any) => (
          <Radio.Group
            value={record.isOk}
            disabled={isReadOnly}
            onChange={(e) => handleStatusChange(record.rollNo, e.target.value)}
            optionType="button"
            buttonStyle="solid"
          >
            <Radio.Button value={true} className="px-3">合格 (G)</Radio.Button>
            <Radio.Button value={false} className="px-3 hover:bg-red-50">異常 (R)</Radio.Button>
          </Radio.Group>
        )
      }
    ];
  }, [templateItems, isReadOnly, handleMeasuredItemValueChange, handleStatusChange, detail?.sampleSize]);

  return (
    <Drawer
      title={
        <div className="flex justify-between items-center w-full pr-8">
          <span>{isReadOnly ? '品質檢驗記錄單備查' : 'IQC 抽樣進料檢驗錄入'}</span>
          {detail?.inspectionStatus && (
            <Tag color={
              detail.inspectionStatus === 'AllPass' ? 'success' : 
              (detail.inspectionStatus === 'ConcessionApproved' ? 'cyan' : 
              (detail.inspectionStatus === 'ConcessionPending' ? 'gold' : 
              (detail.inspectionStatus === 'Reject' ? 'error' : 'warning')))
            }>
              目前狀態：{
                detail.inspectionStatus === 'AllPass' ? '全部通過已入庫' :
                (detail.inspectionStatus === 'ConcessionApproved' ? '特採核准全數入庫' :
                (detail.inspectionStatus === 'ConcessionPending' ? '特採會簽審核中' :
                (detail.inspectionStatus === 'Reject' ? '全部拒收退回' : '待檢驗')))
              }
            </Tag>
          )}
        </div>
      }
      width="85%"
      onClose={onClose}
      open={open}
      destroyOnClose
      maskClosable={false} // 💡 UX規範：Drawer禁止點擊背景關閉，防數據遺失
      footer={
        <div className="flex justify-between items-center p-2 bg-[var(--ant-color-bg-container)]">
          <div>
            {iqcRecordId && (
              <Space>
                <Button
                  type="dashed"
                  size="large"
                  loading={isDownloading}
                  className="border-blue-500 text-blue-600 rounded-md hover:bg-blue-50/20"
                  onClick={handlePrintPdf}
                >
                  下載品檢報告 (PDF)
                </Button>
                {(overallResult === 'Concession' || detail?.inspectionStatus?.startsWith('Concession')) && (
                  <Button
                    type="dashed"
                    size="large"
                    loading={isDownloading}
                    className="border-amber-500 text-amber-600 rounded-md hover:bg-amber-50/20"
                    onClick={handlePrintConcessionPdf}
                    icon={<FilePdfOutlined />}
                  >
                    列印特採申請單 (PDF)
                  </Button>
                )}
              </Space>
            )}
          </div>
          <div className="flex gap-3">
            <Button onClick={onClose} size="large" className="rounded-md">返回列表</Button>
            {!isReadOnly && (
              <Button onClick={handleResetToPending} size="large" className="rounded-md border-slate-300">
                恢復為待檢驗狀態
              </Button>
            )}
            
            {/* 💡 主按鈕行為智慧分流 */}
            {!isReadOnly && (
              <Button 
                type="primary" 
                size="large" 
                icon={<SaveOutlined />} 
                className="bg-blue-600 hover:bg-blue-500 rounded-md text-white px-8"
                onClick={handleProceedToPosting}
              >
                進行品質判定與過帳
              </Button>
            )}

            {detail?.inspectionStatus === 'ConcessionPending' && (
              <Button
                type="primary"
                size="large"
                icon={<AuditOutlined />}
                className="bg-amber-600 hover:bg-amber-500 rounded-md text-white px-8 border-none font-bold"
                onClick={() => setIsReviewModalOpen(true)}
              >
                進行特採會簽與過帳
              </Button>
            )}

            {/* 💡 撤銷與取消過帳按鈕 (唯讀/已結案狀態下展示，具有剛性庫存還原能力) */}
            {isReadOnly && (detail?.inspectionStatus === 'AllPass' || detail?.inspectionStatus === 'Reject' || detail?.inspectionStatus === 'ConcessionApproved' || detail?.inspectionStatus === 'ConcessionPending') && (
              <Button 
                danger
                type="primary"
                icon={<WarningOutlined />}
                onClick={handleCancelPosting} 
                loading={cancelMutation.isPending}
                size="large" 
                className="rounded-md font-bold"
              >
                取消過帳 (還原庫存並重置)
              </Button>
            )}
          </div>
        </div>
      }
    >
      <Spin spinning={isLoading}>
        {detail && (
          <div className="space-y-6">
            {/* 上半部：基本資料單頭 */}
            <Card bordered={false} className="bg-[var(--ant-color-bg-layout)] border border-[var(--ant-color-border-secondary)] rounded-lg">
              <DynamicForm
                formId="iqcBasicForm"
                fields={fields}
                defaultValues={defaultValues}
                isViewMode={isReadOnly}
                isUpdateMode={!isReadOnly}
                hideDefaultFooter={true}
                onSubmit={() => {
                  // 💡 只有當表單驗證完全通過後，才開啟品質判定與過帳彈窗
                  setIsDecisionModalOpen(true);
                }}
              />
            </Card>

            {/* 下半部：品質檢驗抽樣與實測量表 (24 滿欄顯示，提供最寬敞流暢的輸入視界) */}
            <Card 
              bordered={false} 
              className="shadow-sm rounded-lg"
            >
              <div className="mb-3 flex justify-between items-center bg-[var(--ant-color-bg-layout)] px-3 py-2 rounded border border-[var(--ant-color-border-secondary)]">
                <Space size="middle">
                  <Text strong className="text-slate-800 text-sm">品質檢驗抽樣與實測量表</Text>
                  <Divider type="vertical" className="border-slate-300" />
                  {!isReadOnly && detail?.inspectionStatus === 'Pending' ? (
                    <Space size="small">
                      <Text type="secondary" className="text-xs">抽樣比例:</Text>
                      <Select
                        value={isCustomPercent ? 'custom' : samplingPercent}
                        onChange={(val) => {
                          if (val === 'custom') {
                            setIsCustomPercent(true);
                          } else {
                            setIsCustomPercent(false);
                            setSamplingPercent(Number(val));
                          }
                        }}
                        size="small"
                        style={{ width: 100 }}
                        options={isRollMaterial ? [
                          { label: '10 %', value: 10 },
                          { label: '20 %', value: 20 },
                          { label: '30 %', value: 30 },
                          { label: '50 %', value: 50 },
                          { label: '100 % (全檢)', value: 100 },
                          { label: '自訂比例', value: 'custom' },
                        ] : [
                          { label: '1 %', value: 1 },
                          { label: '2 %', value: 2 },
                          { label: '3 %', value: 3 },
                          { label: '4 %', value: 4 },
                          { label: '5 %', value: 5 },
                          { label: '100 % (全檢)', value: 100 },
                          { label: '自訂比例', value: 'custom' },
                        ]}
                      />
                      {isCustomPercent && (
                        <InputNumber
                          min={1}
                          max={100}
                          size="small"
                          value={samplingPercent}
                          formatter={v => `${v}%`}
                          parser={v => Number(v?.replace('%', '') || '')}
                          onChange={(v) => {
                            if (v) setSamplingPercent(v);
                          }}
                          style={{ width: 75 }}
                        />
                      )}
                      <Text type="warning" strong className="text-[var(--ant-color-warning)] font-bold text-xs ml-1">
                        ➡️ 應抽檢: {sampleCount} {unitLabel}
                      </Text>
                    </Space>
                  ) : (
                    <Text type="secondary" className="text-xs">
                      抽樣比例: {samplingPercent}% (應抽檢: {sampleCount} {unitLabel})
                    </Text>
                  )}
                </Space>
                
                <Space size="middle" className="text-xs">
                  <Badge status="default" text={`總數: ${detail.rollCount}`} />
                  <Badge status="processing" text={`抽檢: ${totalInspected}`} />
                  <Badge status="success" text={`合格: ${okCount}`} />
                  <Badge status="error" text={`異常: ${ngCount}`} />
                </Space>
              </div>

              <Table
                dataSource={displayedRolls}
                columns={columns}
                rowKey="rollNo"
                pagination={false}
                className="border border-[var(--ant-color-border-secondary)] rounded-md overflow-hidden"
                rowClassName={(record) => record.isOk ? '' : 'bg-red-500/10 dark:bg-red-950/20 text-red-500'}
              />
            </Card>

            {/* 💡 1. 最終品質判定 Dialog Modal */}
            <Modal
              title={
                <Space>
                  <ExclamationCircleOutlined className={ngCount > 0 ? "text-amber-500" : "text-green-500"} />
                  <span>最終品質判定與過帳 (QE Disposition & Post)</span>
                </Space>
              }
              open={isDecisionModalOpen}
              onCancel={() => setIsDecisionModalOpen(false)}
              okText={
                overallResult === 'Concession' && detail?.inspectionStatus === 'Pending'
                  ? "確認並啟動 100% 全檢"
                  : (overallResult === 'Concession' ? "確認並提交特採申請" : "確認過帳")
              }
              cancelText="取消"
              onOk={
                overallResult === 'Concession' && detail?.inspectionStatus === 'Pending'
                  ? () => {
                      escalateMutation.mutate(undefined, {
                        onSuccess: () => {
                          setIsDecisionModalOpen(false);
                        }
                      });
                    }
                  : handleSubmit
              }
              confirmLoading={
                overallResult === 'Concession' && detail?.inspectionStatus === 'Pending'
                  ? escalateMutation.isPending
                  : completeMutation.isPending
              }
              width={550}
              destroyOnClose
            >
              <div className="space-y-4 py-3">
                <div>
                  <Text type="secondary" className="block mb-2">請選擇此批品質檢驗最終判定結果：</Text>
                  <Radio.Group 
                    value={overallResult}
                    onChange={(e) => {
                      setOverallResult(e.target.value);
                      if (e.target.value === 'Reject') {
                        setResponsibleParty(detail?.supplierCode);
                      }
                    }}
                    className="w-full flex flex-col gap-3"
                  >
                    <Radio.Button value="AllPass" disabled={ngCount > 0} className="w-full py-2 h-auto flex flex-col items-center">
                      <CheckCircleOutlined className="text-green-500 text-lg mb-1" />
                      <Text strong className="text-green-700">AllPass (全部通過)</Text>
                      <Text type="secondary" className="text-xs">整批無異常，全數建卡並正式入庫。</Text>
                    </Radio.Button>

                    <Radio.Button value="Concession" disabled={ngCount === 0} className="w-full py-2 h-auto flex flex-col items-center">
                      <ExclamationCircleOutlined className="text-amber-500 text-lg mb-1" />
                      <Text strong className="text-amber-700">Concession (申請特採)</Text>
                      <Text type="secondary" className="text-xs">有瑕疵但急需/客戶允收，走會簽流程，核准後全數入庫。</Text>
                    </Radio.Button>

                    <Radio.Button value="Reject" className="w-full py-2 h-auto flex flex-col items-center">
                      <CloseCircleOutlined className="text-red-500 text-lg mb-1" />
                      <Text strong className="text-red-700">Reject (全部退回)</Text>
                      <Text type="secondary" className="text-xs">整批拒收退回，全數不建卡入庫，採購量全額扣回。</Text>
                    </Radio.Button>
                  </Radio.Group>
                </div>

                {/* 當有 NG 卷判定退貨時，彈出剛性對帳與扣款警告 */}
                {ngCount > 0 && overallResult === 'Reject' && (
                  <Alert
                    type="warning"
                    showIcon
                    icon={<WarningOutlined className="text-amber-600 text-lg" />}
                    message={<Text strong className="text-amber-800">採購對帳與扣款安全防護</Text>}
                    description={
                      <Text type="secondary" className="text-xs block mt-1">
                        系統偵測到此批到貨判定不合格退貨。
                        過帳後將自動扣減採購單 <Text code>{detail?.purchaseOrderNumber}</Text> 
                        已到貨量，未交量自動釋放，財務將自動扣款，避免企業資產流失。
                      </Text>
                    }
                  />
                )}

                {/* 特採申請前置警示與列印指引 */}
                {overallResult === 'Concession' && (
                  <Alert
                    type="info"
                    showIcon
                    message={<Text strong className="text-blue-800">特採過帳防護與列印說明</Text>}
                    description={
                      <Text type="secondary" className="text-xs block mt-1">
                        選擇特採後，系統會<strong>自動帶入全部 QC 實測明細數據</strong>產生「特採申請會簽單」。
                        過帳後單據狀態將進入「特採審核中」，請於列表或本單左下方<strong>列印特採申請單（PDF）</strong>進行各部門主管線下會簽。
                      </Text>
                    }
                  />
                )}

                <div>
                  <Text type="secondary" className="block mb-1">品質異常判定責任歸屬 (若有):</Text>
                  <Select 
                    className="w-full"
                    value={responsibleParty} 
                    disabled={overallResult === 'AllPass'}
                    onChange={setResponsibleParty}
                    options={[
                      { value: detail.supplierCode, label: `供應商: ${detail.supplierName}` },
                      { value: 'LOG-EXPRESS', label: '物流商責任' },
                      { value: 'INTERNAL-OP', label: '內部責任' },
                    ]}
                  />
                </div>

                <div>
                  <Text type="secondary" className="block mb-1">品檢判定說明 / NCR 處置備註:</Text>
                  <Input.TextArea 
                    placeholder="請輸入判定與備註" 
                    value={notes} 
                    onChange={(e) => setNotes(e.target.value)} 
                    rows={3} 
                  />
                </div>
              </div>
            </Modal>

            {/* 💡 2. 主管特採會簽核定審查 Dialog Modal */}
            <Modal
              title={
                <Space>
                  <AuditOutlined className="text-amber-500" />
                  <span>特採會簽決策審查 (Concession Review)</span>
                </Space>
              }
              open={isReviewModalOpen}
              onCancel={() => setIsReviewModalOpen(false)}
              footer={null}
              width={500}
              destroyOnClose
            >
              <div className="space-y-4 py-3">
                <Alert
                  type="info"
                  showIcon
                  message="目前此單處於【特採會簽審核中】"
                  description="請點擊下方下載/列印帶入全部 QC 實測數據的紙本會簽單。完成線下跨部門會簽後，主管請在下方輸入核定意見並點擊「核准」或「拒絕」。"
                />
                
                <Button
                  type="dashed"
                  size="large"
                  loading={isDownloading}
                  className="w-full border-amber-500 text-amber-600 rounded-md hover:bg-amber-50/20 font-bold"
                  onClick={handlePrintConcessionPdf}
                  icon={<FilePdfOutlined />}
                >
                  下載/列印 A4 特採申請會簽單 (PDF)
                </Button>

                <Divider className="my-2" />

                <div>
                  <Text type="secondary" className="block mb-1">跨部門主管審查與核定意見：</Text>
                  <Input.TextArea 
                    placeholder="請輸入審查核定意見與備註（例如：已取得客戶限度書同意，特採放行）..." 
                    value={notes} 
                    onChange={(e) => setNotes(e.target.value)} 
                    rows={4} 
                  />
                </div>

                <Row gutter={12} className="pt-2">
                  <Col span={12}>
                    <Button
                      type="primary"
                      size="large"
                      className="w-full bg-green-600 hover:bg-green-500 rounded-md text-white font-bold border-none"
                      loading={approveConcessionMutation.isPending}
                      onClick={() => approveConcessionMutation.mutate(notes)}
                    >
                      核准特採全數入庫
                    </Button>
                  </Col>
                  <Col span={12}>
                    <Button
                      danger
                      type="primary"
                      size="large"
                      className="w-full rounded-md font-bold"
                      loading={rejectConcessionMutation.isPending}
                      onClick={() => rejectConcessionMutation.mutate(notes)}
                    >
                      拒絕特採退回
                    </Button>
                  </Col>
                </Row>
              </div>
            </Modal>
          </div>
        )}
      </Spin>
    </Drawer>
  );
}
