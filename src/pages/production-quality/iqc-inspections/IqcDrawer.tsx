// @ts-nocheck
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Drawer,
  Card,
  Table,
  InputNumber,
  Radio,
  Select,
  Button,
  Tag,
  Space,
  Form,
  Input,
  Typography,
  Divider,
  Badge,
  Alert,
  Row,
  Col,
  message,
  Spin,
  Modal,
  Tooltip,
} from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  SaveOutlined,
  WarningOutlined,
  ArrowRightOutlined,
  FilePdfOutlined,
  AuditOutlined,
  EditOutlined,
  PrinterOutlined,
  DeleteOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getApiV1IqcInspectionByIqcRecordId,
  postApiV1IqcInspectionByIqcRecordIdEscalate,
  postApiV1IqcInspectionByIqcRecordIdComplete,
  getApiV1IqcInspectionByIqcRecordIdPdf,
} from "@/api/generated";
import { useFileDownload } from "@/hooks/useFileDownload";
import { AsyncSelect } from "@/components/Form/AsyncSelect";
import { useAuthStore } from "@/stores/useAuthStore";
import { client } from "@/api/generated/client.gen";
import { DynamicForm } from "@/components/Form/DynamicForm";
import { ActionBar } from "@/components/common/ActionBar";

const { Title, Text } = Typography;

interface MeasuredInputProps {
  rollNo: string;
  itemCode: string;
  initialValue: string | null;
  isReadOnly: boolean;
  onChange: (rollNo: string, itemCode: string, value: string) => void;
  isText?: boolean;
}

const MeasuredInput = React.memo(
  ({
    rollNo,
    itemCode,
    initialValue,
    isReadOnly,
    onChange,
    isText,
  }: MeasuredInputProps) => {
    const [val, setVal] = useState(initialValue || "");

    useEffect(() => {
      setVal(initialValue || "");
    }, [initialValue]);

    const handleBlur = () => {
      if (val !== (initialValue || "")) {
        // 💡 延遲更新父狀態，確保瀏覽器在 React 重新渲染 table 之前，已經完全完成 focus 的 Tab 切換
        setTimeout(() => {
          onChange(rollNo, itemCode, val);
        }, 0);
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.currentTarget.blur();
      }
    };

    return (
      <Input
        id={`iqc_input_${rollNo}_${itemCode}`}
        placeholder="實測值"
        size="small"
        value={val}
        disabled={isReadOnly}
        className={`${isText ? "w-full min-w-[180px] text-left px-2" : "w-32 text-center"} focus:ring-2 focus:ring-blue-400 focus:outline-none rounded`}
        onFocus={(e) => e.target.select()}
        onChange={(e) => setVal(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
      />
    );
  },
);
MeasuredInput.displayName = "MeasuredInput";


interface IqcDrawerProps {
  iqcRecordId: string | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function IqcDrawer({
  iqcRecordId,
  open,
  onClose,
  onSuccess,
}: IqcDrawerProps) {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [rolls, setRolls] = useState<any[]>([]);
  const [overallResult, setOverallResult] = useState<
    "AllPass" | "Concession" | "Reject"
  >("AllPass");
  const [inspectorId, setInspectorId] = useState("");
  const [notes, setNotes] = useState("");
  const [responsibleParty, setResponsibleParty] = useState("");
  const [incomingStorageCode, setIncomingStorageCode] = useState("");
  const [headerCoreDia, setHeaderCoreDia] = useState<number | null>(76.2);
  const [sampleSize, setSampleSize] = useState<number>(1); // 💡 自訂抽樣數量 SampleSize
  const [isEditing, setIsEditing] = useState<boolean>(false);

  // 💡 UX控制彈窗狀態
  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  const { downloadFile, isDownloading } = useFileDownload();

  const handlePrintPdf = () => {
    if (!iqcRecordId) return;
    downloadFile({
      apiFunction: () =>
        getApiV1IqcInspectionByIqcRecordIdPdf({
          path: { iqcRecordId },
          responseType: "blob",
        }),
      successMessage: "品質檢驗報告 PDF 導出成功！",
      filename: `IQC-${iqcRecordId}.pdf`,
      openInNewTab: true,
    });
  };

  const handlePrintConcessionPdf = () => {
    if (!iqcRecordId) return;
    downloadFile({
      apiFunction: () =>
        client.get({
          url: `/api/v1/IqcInspection/${iqcRecordId}/concession-pdf`,
          responseType: "blob",
        }),
      successMessage: "特採申請單 PDF 導出成功！",
      filename: `CONCESSION-${iqcRecordId}.pdf`,
      openInNewTab: true,
    });
  };

  const handlePrintLabelsPdf = () => {
    if (!iqcRecordId) return;
    downloadFile({
      apiFunction: () =>
        client.get({
          url: `/api/v1/IqcInspection/${iqcRecordId}/labels-pdf`,
          responseType: "blob",
        }),
      successMessage: "LPN 卷卡合格標籤 PDF 導出成功！",
      filename: `LABELS-${iqcRecordId}.pdf`,
      openInNewTab: true,
    });
  };

  const handlePrintSingleLabelPdf = useCallback(
    (rollNo: string) => {
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
    },
    [downloadFile],
  );

  const [localStatus, setLocalStatus] = useState<string | null>(null);

  // 1. 取得品檢單詳情
  const {
    data: response,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["iqc-detail", iqcRecordId],
    queryFn: () =>
      getApiV1IqcInspectionByIqcRecordId({
        path: { iqcRecordId: iqcRecordId! },
      }),
    enabled: !!iqcRecordId && open,
    gcTime: 0, // 💡 不在記憶體中快取詳情，關閉即毀棄，確保每次開啟 100% 讀取最新後端資料，絕不顯示過期快取
    refetchOnMount: "always",
  });

  const detail = response?.data?.data;
  const currentStatus = localStatus || detail?.inspectionStatus || "Pending";
  const isReadOnlyPermanent =
    currentStatus !== "Pending" && currentStatus !== "FullInspecting";
  const isReadOnly = isReadOnlyPermanent || !isEditing;
  const isRollMaterial = detail?.materialForm === "R"; // R=捲材, S=片材

  const sampleCount = isReadOnlyPermanent
    ? detail?.sampleSize || rolls.length
    : sampleSize;

  const unitLabel = isRollMaterial ? "卷" : "pcs";

  const resetFormStates = useCallback(() => {
    if (detail?.rolls) {
      setLocalStatus(null); // 💡 清除本地 overrides 狀態
      setIsEditing(false); // 💡 回到唯讀檢視模式
      const dbCoreDia = detail.measuredCoreDiaMm ?? (isRollMaterial ? 76.2 : null);
      setHeaderCoreDia(dbCoreDia);

      const initialRolls = detail.rolls.map((r: any) => {
        const rollCoreDia = r.measuredCoreDiaMm ?? dbCoreDia;
        return {
          ...r,
          actualQtyAux: r.actualQtyAux,
          isOk: r.isOk, // 💡 嚴格讀取資料庫狀態，不判定預設 true！未檢驗時為 null
          measuredThicknessMm:
            r.measuredThicknessMm ?? detail.standardThickness ?? 0.05,
          measuredCoreDiaMm: rollCoreDia,
          lengthMm: r.lengthMm ?? (isRollMaterial ? null : detail.standardLength),
          disposition: r.disposition || "Concession",
          responsibleParty: r.responsibleParty || detail.supplierCode,
          inspectionItems: (r.inspectionItems || []).map((item: any) => {
            if (item.itemCode === "core_dia" && (item.measuredValue === null || item.measuredValue === undefined || item.measuredValue === "")) {
              return { ...item, measuredValue: rollCoreDia !== null ? String(rollCoreDia) : "" };
            }
            return item;
          }),
        };
      });
      setRolls(initialRolls);

      const defaultInspector =
        detail.inspectorId === "PENDING" || !detail.inspectorId
          ? user?.employeeCode || ""
          : detail.inspectorId;
      setInspectorId(defaultInspector);

      if (detail.inspectionStatus !== "Pending") {
        setSampleSize(detail.sampleSize ?? detail.rolls.length ?? 1);
      } else {
        const defaultSize = isRollMaterial
          ? Math.min(detail.rollCount || 1, Math.max(1, Math.ceil(((detail.rollCount || 0) * 30) / 100)))
          : 1;
        setSampleSize(defaultSize);
      }

      setNotes(detail.notes || "");
      setResponsibleParty(detail.responsibleParty || "");
      setIncomingStorageCode(detail.incomingStorageCode || "");

      const defResult =
        detail.inspectionStatus === "Pending"
          ? "AllPass"
          : detail.inspectionStatus === "Reject"
            ? "Reject"
            : detail.inspectionStatus?.startsWith("Concession")
              ? "Concession"
              : "AllPass";
      setOverallResult(defResult);
    }
  }, [detail, isRollMaterial, user]);

  // 當資料載入時，初始化 rolls
  useEffect(() => {
    resetFormStates();
  }, [resetFormStates]);

  // 💡 確保片材/捲材的 rolls 狀態長度至少與當前算出的 sampleCount 一致 (不足則進行動態 Pad 填充明細行)
  useEffect(() => {
    if (
      detail &&
      !isReadOnly &&
      rolls.length > 0 &&
      rolls.length < sampleCount
    ) {
      const templateRoll = rolls[0] || {
        measuredThicknessMm: detail.standardThickness ?? 0.05,
        measuredCoreDiaMm: null,
        lengthMm: detail.standardLength,
        isOk: null,
        disposition: "Concession",
        responsibleParty: detail.supplierCode,
        inspectionItems: detail.rolls?.[0]?.inspectionItems || [],
      };

      const newRolls = [...rolls];
      for (let i = rolls.length + 1; i <= sampleCount; i++) {
        const rollNo = isRollMaterial
          ? `${detail.lotNo}-R${i.toString().padStart(2, "0")}`
          : `${detail.lotNo}-S${i.toString().padStart(2, "0")}`;
        newRolls.push({
          seq: i,
          rollNo: rollNo,
          actualQtyAux: isRollMaterial ? detail.standardLength : 1, // 片材單張樣品為 1 pcs
          isOk: true, // 💡 預設通過
          measuredThicknessMm: templateRoll.measuredThicknessMm,
          measuredCoreDiaMm: headerCoreDia, // ⬅️ 從表頭帶過來
          lengthMm: templateRoll.lengthMm,
          disposition: templateRoll.disposition,
          responsibleParty: templateRoll.responsibleParty,
          inspectionItems: (templateRoll.inspectionItems || []).map(
            (item: any) => {
              const isCoreItem = item.itemCode === "core_dia";
              return {
                ...item,
                measuredValue: isCoreItem && headerCoreDia !== null ? String(headerCoreDia) : (item.measuredValue || ""),
                isOk: true, // 💡 預設項目通過
              };
            },
          ),
        });
      }
      setRolls(newRolls);
    }
  }, [sampleCount, detail, isRollMaterial, rolls.length, isReadOnly, headerCoreDia]);

  // 2. 升級加嚴 100% 全檢之 Mutation
  const escalateMutation = useMutation({
    mutationFn: () =>
      postApiV1IqcInspectionByIqcRecordIdEscalate({
        path: { iqcRecordId: iqcRecordId! },
      }),
    onSuccess: () => {
      message.success(
        "已成功將品檢單解鎖並升級為加嚴 100% 全檢狀態！請務必填寫所有卷卡數據！",
      );
      queryClient.invalidateQueries({ queryKey: ["iqc-detail", iqcRecordId] });
      queryClient.invalidateQueries({ queryKey: ["iqc-inspections"] });
      refetch();
    },
    onError: (err: any) =>
      message.error(err.response?.data?.message || "升級全檢失敗"),
  });

  // 3. 品檢結案最終過帳之 Mutation
  const completeMutation = useMutation({
    mutationFn: (payload: any) =>
      postApiV1IqcInspectionByIqcRecordIdComplete({
        path: { iqcRecordId: iqcRecordId! },
        body: payload,
      }),
    onSuccess: () => {
      setIsDecisionModalOpen(false);
      if (overallResult === "Concession") {
        message.success(
          "已成功提交特採申請並送交會簽中！狀態已更新為【特採審核中】。",
        );
      } else if (overallResult === "AllPass") {
        Modal.confirm({
          title: "🎉 品質判定過帳成功！",
          icon: <CheckCircleOutlined style={{ color: "#52c41a" }} />,
          content: "良品已正式產生 LPN 卷卡並過帳至儲位。是否立刻列印所有卷卡的合格綠色標籤？",
          okText: "一鍵列印合格標籤 (Labels PDF)",
          cancelText: "暫不列印",
          okButtonProps: { type: "primary", style: { backgroundColor: "#52c41a", borderColor: "#52c41a" } },
          onOk: () => {
            handlePrintLabelsPdf();
          }
        });
      } else {
        message.success("品質檢驗判定已整批拒收過帳。已自動回彈採購單已到貨量。");
      }
      setIsEditing(false); // 💡 結案後回到唯讀狀態
      setLocalStatus(overallResult === "Concession" ? "Concession" : "AllPass"); // 💡 立即變更本地狀態
      queryClient.invalidateQueries({ queryKey: ["iqc-detail", iqcRecordId] });
      queryClient.invalidateQueries({ queryKey: ["iqc-inspections"] });
      refetch();
    },
    onError: (err: any) =>
      message.error(err.response?.data?.message || "過帳失敗，請重試"),
  });

  // 4. 特採審核主管核准/拒絕 Mutations
  const approveConcessionMutation = useMutation({
    mutationFn: (notes: string) =>
      client.post({
        url: `/api/v1/IqcInspection/${iqcRecordId}/concession/approve`,
        body: { notes },
      }),
    onSuccess: () => {
      setIsReviewModalOpen(false);
      Modal.confirm({
        title: "🎉 特採審核核准過帳成功！",
        icon: <CheckCircleOutlined style={{ color: "#52c41a" }} />,
        content: "全數特採物料已正式建立 LPN 庫存卡並過帳。是否立刻列印合格綠色標籤？",
        okText: "一鍵列印合格標籤 (Labels PDF)",
        cancelText: "暫不列印",
        okButtonProps: { type: "primary", style: { backgroundColor: "#52c41a", borderColor: "#52c41a" } },
        onOk: () => {
          handlePrintLabelsPdf();
        }
      });
      setIsEditing(false); // 💡 回到唯讀狀態
      setLocalStatus("AllPass"); // 💡 特採核准過帳後狀態變為 AllPass
      queryClient.invalidateQueries({ queryKey: ["iqc-detail", iqcRecordId] });
      queryClient.invalidateQueries({ queryKey: ["iqc-inspections"] });
      refetch();
    },
    onError: (err: any) =>
      message.error(err.response?.data?.message || "核准特採失敗"),
  });

  const rejectConcessionMutation = useMutation({
    mutationFn: (notes: string) =>
      client.post({
        url: `/api/v1/IqcInspection/${iqcRecordId}/concession/reject`,
        body: { notes },
      }),
    onSuccess: () => {
      setIsReviewModalOpen(false);
      message.success(
        "特採申請已被拒絕！此批到貨全數退回拒收，採購量已完成全額回彈扣減。",
      );
      setIsEditing(false); // 💡 回到唯讀狀態
      setLocalStatus("Reject"); // 💡 特採拒絕後狀態變為 Reject
      queryClient.invalidateQueries({ queryKey: ["iqc-detail", iqcRecordId] });
      queryClient.invalidateQueries({ queryKey: ["iqc-inspections"] });
      refetch();
    },
    onError: (err: any) =>
      message.error(err.response?.data?.message || "拒絕特採失敗"),
  });

  // 💡 儲存品檢單草稿之 Mutation
  const saveDraftMutation = useMutation({
    mutationFn: (payload: any) =>
      client.post({
        url: `/api/v1/IqcInspection/${iqcRecordId}/draft`,
        body: payload,
      }),
    onSuccess: () => {
      message.success("品檢草稿儲存成功！");
      setIsEditing(false); // 儲存完後回到唯讀狀態
      queryClient.invalidateQueries({ queryKey: ["iqc-detail", iqcRecordId] });
      queryClient.invalidateQueries({ queryKey: ["iqc-inspections"] });
      refetch();
    },
    onError: (err: any) =>
      message.error(err.response?.data?.message || "儲存草稿失敗，請重試"),
  });

  const handleSaveDraft = () => {
    // 💡 儲存草稿時，僅進行基本必填檢核即可（不強求量測值全填，便於分段錄入）
    if (!inspectorId) {
      message.warning("請輸入品檢人員員工工號");
      return;
    }

    const targetRolls = isReadOnlyPermanent ? rolls : rolls.slice(0, sampleCount);
    const payload = {
      inspectorId,
      incomingStorageCode: incomingStorageCode || null,
      measuredCoreDiaMm: headerCoreDia || null,
      rolls: targetRolls.map((r: any) => ({
        seq: r.seq,
        rollNo: r.rollNo,
        actualQtyAux: r.actualQtyAux,
        isOk: r.isOk ?? true, // 預設單項合格
        measuredThicknessMm: r.measuredThicknessMm || 0.05,
        measuredCoreDiaMm: r.measuredCoreDiaMm || null,
        lengthMm: r.lengthMm || null,
        disposition: r.disposition || "Concession",
        responsibleParty: r.responsibleParty || detail.supplierCode,
        inspectionItems: (r.inspectionItems || []).map((item: any) => ({
          itemCode: item.itemCode,
          itemName: item.itemName,
          specification: item.specification,
          measuredValue: item.measuredValue || "",
          isOk: item.isOk ?? true,
        })),
      })),
    };

    saveDraftMutation.mutate(payload);
  };

  // 5. 事件處理器 (智慧項目連動，整卷只有一個 OK/NG 判定按鈕)
  const handleMeasuredItemValueChange = useCallback(
    (rollNo: string, itemCode: string, value: string) => {
      if (isReadOnly) return;
      setRolls((prevRolls) =>
        prevRolls.map((r) => {
          if (r.rollNo === rollNo) {
            const updatedItems = r.inspectionItems.map((i: any) => {
              if (i.itemCode === itemCode) {
                return { ...i, measuredValue: value };
              }
              return i;
            });

            // 💡 同步更新最上端實體屬性，確保 DTO/API 儲存與物理卷卡建立之屬性 100% 正確
            const extraUpdates: any = {};
            if (itemCode === "core_dia") {
              const numVal = parseFloat(value);
              extraUpdates.measuredCoreDiaMm = isNaN(numVal) ? null : numVal;
            } else if (itemCode === "thickness") {
              const numVal = parseFloat(value);
              extraUpdates.measuredThicknessMm = isNaN(numVal) ? 0.05 : numVal;
            }

            return { ...r, inspectionItems: updatedItems, ...extraUpdates };
          }
          return r;
        }),
      );
    },
    [isReadOnly],
  );

  const handleStatusChange = useCallback(
    (rollNo: string, isOk: boolean) => {
      if (isReadOnly) return;
      setRolls((prevRolls) => {
        const updated = prevRolls.map((r) => {
          if (r.rollNo === rollNo) {
            return {
              ...r,
              isOk,
              disposition: isOk ? undefined : "Concession",
              responsibleParty: isOk ? undefined : detail?.supplierCode,
              // 智慧連動：將此卷下所有動態品質項目的 isOk 同步為此卷的判定狀態
              inspectionItems: r.inspectionItems.map((i: any) => ({
                ...i,
                isOk,
              })),
            };
          }
          return r;
        });

        const hasNg = updated.some((r) => r.isOk === false);
        setOverallResult(hasNg ? "Concession" : "AllPass");
        return updated;
      });
    },
    [isReadOnly, detail?.supplierCode],
  );

  const handleSupplierLotNoChange = useCallback(
    (rollNo: string, val: string) => {
      if (isReadOnly) return;
      // 💡 僅存大寫英數字及符號，禁中文；輸入小寫自動轉大寫
      const cleanVal = val.replace(/[\u4e00-\u9fa5]/g, "").toUpperCase();
      setRolls((prevRolls) =>
        prevRolls.map((r) => (r.rollNo === rollNo ? { ...r, supplierLotNo: cleanVal } : r))
      );
    },
    [isReadOnly],
  );

  const handleActualQtyAuxChange = useCallback(
    (rollNo: string, val: number) => {
      if (isReadOnly) return;
      setRolls((prevRolls) =>
        prevRolls.map((r) => (r.rollNo === rollNo ? { ...r, actualQtyAux: val } : r))
      );
    },
    [isReadOnly],
  );

  const handleAddSheetRow = useCallback(() => {
    if (isReadOnly || !detail) return;
    setRolls((prevRolls) => {
      const templateRoll = prevRolls[0] || {
        measuredThicknessMm: detail.standardThickness ?? 0.05,
        measuredCoreDiaMm: null,
        lengthMm: detail.standardLength,
        isOk: true,
        disposition: "Concession",
        responsibleParty: detail.supplierCode,
        inspectionItems: [],
      };
      const newSeq = prevRolls.length + 1;
      const rollNo = `${detail.lotNo}-S${newSeq.toString().padStart(2, "0")}`;
      
      const newRow = {
        seq: newSeq,
        rollNo: rollNo,
        actualQtyAux: 0, // 新增行預設 0 PCS
        supplierLotNo: "", // 預設空
        isOk: true,
        measuredThicknessMm: templateRoll.measuredThicknessMm,
        measuredCoreDiaMm: null,
        lengthMm: templateRoll.lengthMm,
        disposition: undefined,
        responsibleParty: undefined,
        inspectionItems: (templateRoll.inspectionItems || []).map((itm: any) => ({
          ...itm,
          measuredValue: "",
          isOk: true,
        })),
      };
      const updated = [...prevRolls, newRow];
      setSampleSize(updated.length);
      return updated;
    });
  }, [isReadOnly, detail]);

  const handleDeleteSheetRow = useCallback((targetRollNo: string) => {
    if (isReadOnly || !detail) return;
    setRolls((prevRolls) => {
      if (prevRolls.length <= 1) {
        message.warning("至少必須保留一組原廠批號進行品質判定！");
        return prevRolls;
      }
      const filtered = prevRolls.filter((r) => r.rollNo !== targetRollNo);
      const reordered = filtered.map((r, index) => {
        const newSeq = index + 1;
        const rollNo = `${detail.lotNo}-S${newSeq.toString().padStart(2, "0")}`;
        return {
          ...r,
          seq: newSeq,
          rollNo: rollNo
        };
      });
      setSampleSize(reordered.length);
      return reordered;
    });
  }, [isReadOnly, detail]);

  // 3.5 重置為待檢驗狀態之 Mutation (真正呼叫後端 API 進行資料庫清空重置)
  const resetMutation = useMutation({
    mutationFn: () =>
      client.post({
        url: `/api/v1/IqcInspection/${iqcRecordId}/reset`,
      }),
    onSuccess: () => {
      message.success("已成功將此品檢單恢復為全新的待檢驗狀態！");
      setLocalStatus("Pending");
      setSamplingPercent(isRollMaterial ? 30 : 1);
      setIsCustomPercent(false);
      queryClient.invalidateQueries({ queryKey: ["iqc-detail", iqcRecordId] });
      queryClient.invalidateQueries({ queryKey: ["iqc-inspections"] });
      refetch();
    },
    onError: (err: any) =>
      message.error(err.response?.data?.message || "重置待檢驗失敗"),
  });

  const handleResetToPending = () => {
    if (!detail) return;
    Modal.confirm({
      title: "確認恢復為待檢驗狀態",
      icon: <ExclamationCircleOutlined className="text-amber-500" />,
      content:
        "確定要清除當前填寫的所有實測數據，並呼叫 API 將資料庫中此品檢單恢復為全新的【待檢驗】狀態（同時解鎖並重設抽樣比例為預設 30%）嗎？",
      okText: "確認恢復",
      cancelText: "取消",
      onOk: () => {
        resetMutation.mutate();
      },
    });
  };

  // 💡 取消過帳並還原庫存之 Mutation (呼叫後端 API 撤銷判定與沖銷庫存)
  const cancelMutation = useMutation({
    mutationFn: (notes: string) =>
      client.post({
        url: `/api/v1/IqcInspection/${iqcRecordId}/cancel`,
        body: { notes },
      }),
    onSuccess: () => {
      message.success(
        "已成功取消此品檢單過帳判定，並順利註銷 LPN 與還原庫存量！",
      );
      setLocalStatus("Pending");
      setIsEditing(true); // 💡 取消過帳後，直接轉為編輯模式，免去手動再次點擊「編輯」
      queryClient.invalidateQueries({ queryKey: ["iqc-detail", iqcRecordId] });
      queryClient.invalidateQueries({ queryKey: ["iqc-inspections"] });
      refetch();
    },
    onError: (err: any) => {
      const errMsg =
        err.response?.data?.message || err.message || "取消過帳失敗";
      Modal.error({
        title: "撤銷過帳失敗 (ERP 剛性業務鎖定)",
        content: errMsg,
        okText: "確認",
      });
    },
  });

  const handleCancelPosting = () => {
    if (!detail) return;

    let notesValue = "";

    Modal.confirm({
      title: "⚠️ 確認取消品檢單過帳？",
      icon: <WarningOutlined className="text-red-500" />,
      content: (
        <div className="space-y-2 mt-2">
          <p className="text-red-500 font-bold text-sm">
            此為 ERP 庫存與帳務沖銷之高風險操作！
          </p>
          <div className="text-xs text-slate-500 space-y-1">
            <p>系統將執行以下剛性沖銷：</p>
            <p>1. 註銷這批單據產生的全部實物 LPN 卷卡。</p>
            <p>2. 扣減已增加的可用邏輯庫存量。</p>
            <p>3. 刪除相關庫存交易流水帳。</p>
            <p>4. 若為不合格退貨，將還原（累加回）採購單已到貨量。</p>
            <p>5. 將單據狀態重置回 Pending（待檢驗）。</p>
          </div>
          <p className="text-xs text-red-500 font-semibold mt-2">
            ※
            注意：若此批中任何卷卡已在車間投產（WIP）或被消耗，系統將自動拒絕此操作！
          </p>
          <div className="mt-4">
            <span className="text-xs text-slate-600 block mb-1">
              請輸入取消過帳原因/理由：
            </span>
            <Input.TextArea
              placeholder="請輸入取消理由，如：輸入數據錯誤，需退回重新檢驗錄入..."
              onChange={(e) => {
                notesValue = e.target.value;
              }}
              rows={3}
            />
          </div>
        </div>
      ),
      okText: "確認取消過帳",
      okButtonProps: { danger: true },
      cancelText: "放棄",
      onOk: () => {
        cancelMutation.mutate(notesValue);
      },
    });
  };

  const handleClose = () => {
    if (isEditing) {
      Modal.confirm({
        title: "確認關閉",
        content:
          "您當前正在編輯模式中，確定要關閉並離開嗎？未儲存的編輯將會遺失！",
        okText: "確定離開",
        cancelText: "取消",
        onOk: () => {
          setIsEditing(false);
          onClose();
        },
      });
    } else {
      onClose();
    }
  };

  const handleProceedToPosting = () => {
    // 💡 獨立於編輯狀態外，直接執行剛性全域欄位與品檢項目的完整檢核，並開啟判定彈窗
    if (validateIqcFields()) {
      setIsDecisionModalOpen(true);
    }
  };

  const getActionBarActions = () => {
    return (
      <Space>
        {/* 💡 編輯按鈕：只有在可編輯狀態（未結案）且當前為唯讀狀態時顯示 */}
        {!isReadOnlyPermanent && !isEditing && (
          <Button
            key="edit"
            type="primary"
            size="large"
            icon={<EditOutlined />}
            className="bg-blue-600 hover:bg-blue-500 rounded-md text-white"
            onClick={() => setIsEditing(true)}
          >
            編輯
          </Button>
        )}

        {/* 💡 儲存草稿按鈕：僅在編輯狀態下顯示 */}
        {isEditing && (
          <Button
            key="save-draft"
            type="primary"
            size="large"
            icon={<SaveOutlined />}
            className="bg-blue-600 hover:bg-blue-500 rounded-md text-white"
            loading={saveDraftMutation.isPending}
            onClick={handleSaveDraft}
          >
            儲存
          </Button>
        )}

        {/* 💡 取消編輯按鈕：進入編輯狀態時顯示 */}
        {isEditing && (
          <Button
            key="cancel-edit"
            size="large"
            onClick={() => {
              resetFormStates();
            }}
            className="rounded-md"
          >
            取消編輯
          </Button>
        )}

        {/* 💡 進行品質判定與過帳（儲存並過帳）：只要單據未結案，且當前不在編輯模式時（防呆機制），直接點擊進行判定與過帳 */}
        {!isReadOnlyPermanent && !isEditing && (
          <Button
            key="save-post"
            type="primary"
            size="large"
            icon={<CheckCircleOutlined />}
            className="bg-green-600 hover:bg-green-500 rounded-md text-white px-6 border-none font-bold"
            onClick={handleProceedToPosting}
          >
            進行品質判定與過帳
          </Button>
        )}

        {detail?.inspectionStatus === "ConcessionPending" && (
          <Button
            key="concession-post"
            type="primary"
            size="large"
            icon={<AuditOutlined />}
            className="bg-amber-600 hover:bg-amber-500 rounded-md text-white px-6 border-none font-bold"
            onClick={() => setIsReviewModalOpen(true)}
          >
            進行特採會簽與過帳
          </Button>
        )}

        {isReadOnly &&
          (detail?.inspectionStatus === "AllPass" ||
            detail?.inspectionStatus === "Reject" ||
            detail?.inspectionStatus === "ConcessionApproved" ||
            detail?.inspectionStatus === "ConcessionPending") && (
            <Button
              key="cancel-posting"
              danger
              type="primary"
              size="large"
              icon={<WarningOutlined />}
              onClick={handleCancelPosting}
              loading={cancelMutation.isPending}
              className="rounded-md font-bold"
            >
              取消過帳 (還原庫存並重置)
            </Button>
          )}
      </Space>
    );
  };

  const displayedRolls = isReadOnlyPermanent ? rolls : rolls.slice(0, sampleCount);

  const validateIqcFields = (): boolean => {
    if (!inspectorId) {
      message.warning("請輸入品檢人員員工工號");
      return false;
    }

    if (!incomingStorageCode) {
      message.warning("請選擇入庫儲位");
      return false;
    }

    // 剛性檢核：判定與過帳時，必須每個欄位與品檢項目都有填入值
    for (let i = 0; i < displayedRolls.length; i++) {
      const r = displayedRolls[i];
      const nameLabel = isRollMaterial ? `第 ${r.seq} 卷` : `第 ${r.seq} 包/片`;

      if (!isRollMaterial && (!r.supplierLotNo || r.supplierLotNo.trim() === "")) {
        message.warning(`請輸入 ${nameLabel} 的「原廠生產批號」`);
        return false;
      }

      if (
        r.actualQtyAux === null ||
        r.actualQtyAux === undefined ||
        r.actualQtyAux === ""
      ) {
        message.warning(`請輸入 ${nameLabel} 的「實測數量」`);
        return false;
      }

      if (Number(r.actualQtyAux) <= 0) {
        message.warning(`${nameLabel} 的「實測數量」必須大於 0`);
        return false;
      }

      if (
        r.measuredThicknessMm === null ||
        r.measuredThicknessMm === undefined ||
        r.measuredThicknessMm === ""
      ) {
        message.warning(`請輸入 ${nameLabel} 的「實測厚度」`);
        return false;
      }

      if (Number(r.measuredThicknessMm) <= 0) {
        message.warning(`${nameLabel} 的「實測厚度」必須大於 0`);
        return false;
      }

      if (isRollMaterial) {
        if (
          r.measuredCoreDiaMm === null ||
          r.measuredCoreDiaMm === undefined ||
          r.measuredCoreDiaMm === ""
        ) {
          message.warning(`請輸入 ${nameLabel} 的「實測紙管」`);
          return false;
        }
        if (Number(r.measuredCoreDiaMm) <= 0) {
          message.warning(`${nameLabel} 的「實測紙管」必須大於 0`);
          return false;
        }
      }

      // 檢核品檢細項參數
      for (let j = 0; j < r.inspectionItems.length; j++) {
        const item = r.inspectionItems[j];
        if (!item.measuredValue || item.measuredValue.trim() === "") {
          message.warning(
            `請填寫 ${nameLabel} 檢驗項目【${item.itemName}】的「實測值」`,
          );
          return false;
        }
      }
    }

    if (!isRollMaterial) {
      const totalAllocated = displayedRolls.reduce((sum, r) => sum + (Number(r.actualQtyAux) || 0), 0);
      if (totalAllocated !== (detail?.rollCount ?? 0)) {
        message.warning(`片料入庫數量分配不平衡！進貨總量: ${(detail?.rollCount ?? 0).toLocaleString()} PCS，目前分配總量: ${totalAllocated.toLocaleString()} PCS`);
        return false;
      }
    }

    return true;
  };

  const handleSubmit = () => {
    if (!validateIqcFields()) {
      return;
    }

    const hasNg = displayedRolls.some((r) => r.isOk === false);
    if (hasNg && overallResult === "AllPass") {
      message.warning(
        "明細中存有異常卷料，判定結果不可為 AllPass (全部通過)！",
      );
      return;
    }

    if (!hasNg && overallResult === "Concession") {
      message.warning(
        "明細中無異常不良品，不可申請特採！請選擇 AllPass (全部通過)。",
      );
      return;
    }

    // 剛性檢核：若為特採 Concession，必須為 100% 全檢 (也就是 displayedRolls.length === detail.rollCount)
    if (
      overallResult === "Concession" &&
      displayedRolls.length < detail?.rollCount
    ) {
      message.error(
        "依 ISO 規範，若有不良品欲申請特採，必須先將剩下未檢驗的卷料全部檢驗完成！請先啟動「100% 全檢」！",
      );
      return;
    }

    // 組裝過帳 Payloads
    const payload = {
      overallResult,
      inspectorId: inspectorId.toUpperCase(),
      responsibleParty:
        overallResult !== "AllPass"
          ? responsibleParty || detail?.supplierCode
          : undefined,
      notes,
      incomingStorageCode: incomingStorageCode || undefined,
      sampleSize: sampleCount, // 💡 同步將計算出的抽樣數回寫至資料庫
      measuredCoreDiaMm: headerCoreDia || undefined,
      rolls: displayedRolls.map((r) => ({
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
          measuredValue: i.measuredValue || "",
          isOk: i.isOk,
        })),
      })),
    };

    completeMutation.mutate(payload);
  };

  // 5. 數據與看板計算
  const isReadOnlyMode = isReadOnly || isReadOnlyPermanent;
  const iqcSampleSize = (isReadOnlyMode && detail?.sampleSize) ? detail.sampleSize : sampleCount;

  const inspectedRolls = displayedRolls.filter((r) => r.seq <= iqcSampleSize);

  const totalInspected = inspectedRolls.filter(
    (r) => r.isOk !== null && r.isOk !== undefined,
  ).length;
  const okCount = inspectedRolls.filter((r) => r.isOk === true).length;
  const ngCount = inspectedRolls.filter((r) => r.isOk === false).length;

  const fields = [
    {
      name: "iqcRecordId",
      label: "品檢單號",
      componentType: "Input",
      editable: "never",
      colSpan: 4,
    },
    {
      name: "sourceDocNumber",
      label: "來源進貨單號",
      componentType: "Input",
      editable: "never",
      colSpan: 4,
    },
    {
      name: "poLineNumber",
      label: "關聯採購項次",
      componentType: "Input",
      editable: "never",
      colSpan: 4,
    },
    {
      name: "lotNo",
      label: "批次代碼",
      componentType: "Input",
      editable: "never",
      colSpan: 4,
    },
    {
      name: "supplierCode",
      label: "供應商",
      componentType: "Custom",
      colSpan: 4,
      customRender: () => (
        <Input
          value={
            detail?.supplierCode
              ? `[${detail.supplierCode}] ${detail.supplierName || ""}`
              : ""
          }
          disabled
          className="w-full text-[var(--ant-color-text)] font-semibold"
        />
      ),
    },
    {
      name: "materialCode",
      label: "物料編碼",
      componentType: "Input",
      editable: "never",
      colSpan: 4,
    },
    {
      name: "materialName",
      label: "物料名稱",
      componentType: "Input",
      editable: "never",
      colSpan: 4,
    },
    {
      name: "inspectorId",
      label: "品檢人員工代碼",
      componentType: "Custom",
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
      ),
    },
    {
      name: "standardThickness",
      label: "標準厚度 (mm)",
      componentType: "InputNumber",
      editable: "never",
      colSpan: 6,
      componentProps: {
        className: "text-right",
      },
    },
    {
      name: "standardWidth",
      label: "標準寬度 (mm)",
      componentType: "InputNumber",
      editable: "never",
      colSpan: 6,
      componentProps: {
        className: "text-right",
      },
    },
    {
      name: "standardLength",
      label: isRollMaterial ? "標準長度 (M)" : "標準長度 (mm)",
      componentType: "InputNumber",
      editable: "never",
      colSpan: 6,
      componentProps: {
        className: "text-right",
      },
    },
    {
      name: "rollCount",
      label: isRollMaterial ? "到貨總卷數" : "數量",
      componentType: "InputNumber",
      editable: "never",
      colSpan: 6,
      componentProps: {
        className: "text-right",
      },
    },
    {
      name: "totalActualQty",
      label: isRollMaterial ? "到貨總長度" : "到貨總張數",
      componentType: "Custom",
      colSpan: 6,
      customRender: () => (
        <Input
          value={`${totalLength.toLocaleString()} ${isRollMaterial ? "M" : "PCS"}`}
          disabled
          className="w-full text-[var(--ant-color-text)] font-semibold text-right"
        />
      ),
    },
    {
      name: "measuredCoreDiaMm",
      label: "管芯內外徑 (mm)",
      componentType: "Custom",
      colSpan: 6,
      customRender: (props: any) => (
        <InputNumber
          value={props.value !== undefined ? props.value : headerCoreDia}
          disabled={isReadOnly || !isRollMaterial}
          precision={1}
          style={{ width: "100%" }}
          className="w-full text-right"
          onChange={(val) => {
            const numVal = val != null ? Number(val) : null;
            setHeaderCoreDia(numVal);
            props.onChange(numVal);
            
            // 💡 當使用者更改表頭管芯徑時，連動更新所有明細行中尚未修改的 core_dia 項目值！
            setRolls((prevRolls) =>
              prevRolls.map((r) => {
                const updatedItems = r.inspectionItems.map((i: any) => {
                  if (i.itemCode === "core_dia") {
                    return { ...i, measuredValue: numVal !== null ? String(numVal) : "" };
                  }
                  return i;
                });
                return {
                  ...r,
                  measuredCoreDiaMm: numVal,
                  inspectionItems: updatedItems,
                };
              }),
            );
          }}
        />
      ),
    },
    {
      name: "materialForm",
      label: "材料型態",
      componentType: "Select",
      editable: "never",
      colSpan: 6,
      componentProps: {
        options: [
          { label: "捲材 (Coil)", value: "R" },
          { label: "片材 (Sheet)", value: "S" },
        ],
      },
    },    
    {
      name: "incomingStorageCode",
      label: "入庫儲位",
      componentType: "Custom",
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
            setIncomingStorageCode(val || "");
            props.onChange(val || "");
          }}
          allowClear
        />
      ),
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
    incomingStorageCode: incomingStorageCode,
    measuredCoreDiaMm: headerCoreDia,
  };

  // 💡 動態依範本產生檢驗項目欄位，將實測值直接行內顯示 (不帶 OK/NG 按鈕，按鈕獨立在檢驗判定列)
  const templateItems = useMemo(() => {
    return detail?.rolls?.[0]?.inspectionItems || [];
  }, [detail]);

  const columns = useMemo(() => {
    const dynamicColumns = templateItems.map((item: any) => ({
      title: `${item.itemName} (${item.specification})`,
      key: `item_${item.itemCode}`,
      align: (item.itemCode === "appearance" ? "left" : "center") as const,
      width: item.itemCode === "appearance" ? 220 : 130,
      render: (_: any, record: any) => {
        const rollItem = record.inspectionItems?.find(
          (i: any) => i.itemCode === item.itemCode,
        );
        if (!rollItem) return "-";
        return (
          <MeasuredInput
            rollNo={record.rollNo}
            itemCode={item.itemCode}
            initialValue={rollItem.measuredValue}
            isReadOnly={isReadOnly}
            onChange={handleMeasuredItemValueChange}
            isText={item.itemCode === "appearance"}
          />
        );
      },
    }));

    const baseColumns: any[] = [
      {
        title: "流水號",
        dataIndex: "seq",
        key: "seq",
        width: 80,
        align: "left" as const,
        render: (seq: number, record: any) => {
          const isAutoApproved =
            !!(isReadOnly && detail?.sampleSize && record.seq > detail.sampleSize);
          return (
            <Space>
              <Badge
                status={
                  isAutoApproved ? "default" : record.isOk ? "success" : "error"
                }
              />
              <Text
                strong={!record.isOk}
                className={
                  record.isOk ? "text-slate-700" : "text-red-500 font-bold"
                }
              >
                {seq}
              </Text>
              {isAutoApproved && <Tag color="default">免檢</Tag>}
            </Space>
          );
        },
      }
    ];

    if (!isRollMaterial) {
      // [IQC-04] 片料專屬：原廠生產批號與分攤片數
      baseColumns.push(
        {
          title: "原廠生產批號 (SupplierLotNo)",
          dataIndex: "supplierLotNo",
          key: "supplierLotNo",
          width: 220,
          align: "left" as const,
          render: (val: string, record: any) => {
            if (isReadOnly) {
              return <Text strong className="font-mono">{val || <span className="text-slate-400">（空白）</span>}</Text>;
            }
            return (
              <Input
                value={val}
                size="small"
                placeholder="請輸入或掃描原廠批號"
                className="font-mono uppercase"
                onChange={(e) => handleSupplierLotNoChange(record.rollNo, e.target.value)}
              />
            );
          }
        },
        {
          title: "分攤片數 (PCS)",
          dataIndex: "actualQtyAux",
          key: "actualQtyAux",
          width: 140,
          align: "right" as const,
          render: (val: number, record: any) => {
            if (isReadOnly) {
              return <Text strong className="font-mono">{val?.toLocaleString()} PCS</Text>;
            }
            return (
              <InputNumber
                value={val}
                size="small"
                min={0}
                max={1000000}
                style={{ width: "100%" }}
                onChange={(num) => handleActualQtyAuxChange(record.rollNo, num ?? 0)}
              />
            );
          }
        }
      );
    }

    baseColumns.push(...dynamicColumns);

    baseColumns.push({
      title: "檢驗判定",
      key: "isOk",
      width: 160,
      align: "center" as const,
      render: (_: any, record: any) => (
        <Radio.Group
          value={record.isOk}
          disabled={isReadOnly}
          onChange={(e) => handleStatusChange(record.rollNo, e.target.value)}
          optionType="button"
          buttonStyle="solid"
          size="small"
        >
          <Radio.Button 
            value={true} 
            className="px-2"
            style={
              record.isOk === true
                ? {
                    backgroundColor: "#52c41a",
                    borderColor: "#52c41a",
                    color: "#fff",
                    opacity: isReadOnly ? 0.65 : 1,
                  }
                : undefined
            }
          >
            合格
          </Radio.Button>
          <Radio.Button 
            value={false} 
            className="px-2"
            style={
              record.isOk === false
                ? {
                    backgroundColor: "#ff4d4f",
                    borderColor: "#ff4d4f",
                    color: "#fff",
                    opacity: isReadOnly ? 0.65 : 1,
                  }
                : undefined
            }
          >
            異常
          </Radio.Button>
        </Radio.Group>
      ),
    });

    if (!isRollMaterial && !isReadOnly) {
      baseColumns.push({
        title: "操作",
        key: "action",
        width: 70,
        align: "center" as const,
        render: (_: any, record: any) => (
          <Button
            type="text"
            danger
            size="small"
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteSheetRow(record.rollNo)}
          />
        )
      });
    }

    if (isReadOnlyPermanent) {
      baseColumns.push({
        title: "標籤補印",
        key: "print_action",
        width: 90,
        align: "center" as const,
        render: (_: any, record: any) => {
          if (record.isOk === false)
            return <span className="text-slate-400">-</span>;
          return (
            <Tooltip title="單卷補印合格標籤">
              <Button
                type="text"
                size="small"
                icon={<PrinterOutlined style={{ color: "#722ed1" }} />}
                onClick={() => handlePrintSingleLabelPdf(record.rollNo)}
              />
            </Tooltip>
          );
        },
      });
    }

    return baseColumns;
  }, [
    templateItems,
    isReadOnly,
    isReadOnlyPermanent,
    handleMeasuredItemValueChange,
    handleStatusChange,
    detail?.sampleSize,
    handlePrintSingleLabelPdf,
    isRollMaterial,
    handleSupplierLotNoChange,
    handleActualQtyAuxChange,
    handleDeleteSheetRow,
  ]);

  const totalLength = useMemo(() => {
    if (!detail?.rolls) return 0;
    return detail.rolls.reduce((sum, r) => sum + (r.actualQtyAux || 0), 0);
  }, [detail?.rolls]);

  const totalAllocatedPcs = useMemo(() => {
    if (isRollMaterial) return 0;
    return rolls.reduce((sum, r) => sum + (Number(r.actualQtyAux) || 0), 0);
  }, [isRollMaterial, rolls]);

  const isSheetTotalMismatched = !isRollMaterial && totalAllocatedPcs !== (detail?.rollCount ?? 0);

  return (
    <Drawer
      title={
        <div className="flex justify-between items-center w-full pr-8">
          <span>
            {isReadOnly ? "品質檢驗記錄單備查" : "IQC 抽樣進料檢驗錄入"}
          </span>
          {detail?.inspectionStatus && (
            <Tag
              color={
                detail.inspectionStatus === "AllPass"
                  ? "success"
                  : detail.inspectionStatus === "ConcessionApproved"
                    ? "cyan"
                    : detail.inspectionStatus === "ConcessionPending"
                      ? "gold"
                      : detail.inspectionStatus === "Reject"
                        ? "error"
                        : "warning"
              }
            >
              目前狀態：
              {detail.inspectionStatus === "AllPass"
                ? "全部通過已入庫"
                : detail.inspectionStatus === "ConcessionApproved"
                  ? "特採核准全數入庫"
                  : detail.inspectionStatus === "ConcessionPending"
                    ? "特採會簽審核中"
                    : detail.inspectionStatus === "Reject"
                      ? "全部拒收退回"
                      : "待檢驗"}
            </Tag>
          )}
        </div>
      }
      width="85%"
      onClose={handleClose}
      open={open}
      destroyOnClose
      maskClosable={isReadOnly} // 💡 UX規範：編輯或錄入狀態下禁止點擊背景關閉（防數據遺失），唯讀/備查模式下允許點擊背景自動關閉
      styles={{
        body: {
          padding: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        },
      }}
      footer={
        <div className="flex justify-between items-center p-2 bg-[var(--ant-color-bg-container)]">
          <div>
            {iqcRecordId && !isEditing && (
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
                {detail?.inspectionStatus &&
                  ["AllPass", "ConcessionApproved", "Partial"].includes(
                    detail.inspectionStatus,
                  ) && (
                    <Button
                      type="dashed"
                      size="large"
                      loading={isDownloading}
                      className="border-purple-500 text-purple-600 rounded-md hover:bg-purple-50/20"
                      onClick={handlePrintLabelsPdf}
                      icon={<PrinterOutlined />}
                    >
                      列印合格標籤 (PDF)
                    </Button>
                  )}
                {(overallResult === "Concession" ||
                  detail?.inspectionStatus?.startsWith("Concession")) && (
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
            {/* 💡 返回列表：僅在非編輯模式下顯示 */}
            {!isEditing && (
              <Button onClick={handleClose} size="large" className="rounded-md">
                返回列表
              </Button>
            )}

            {/* 💡 恢復為待檢驗狀態：僅在非編輯模式且未結案時顯示 */}
            {!isReadOnlyPermanent && !isEditing && (
              <Button
                onClick={handleResetToPending}
                size="large"
                className="rounded-md border-slate-300"
              >
                恢復為待檢驗狀態
              </Button>
            )}


          </div>
        </div>
      }
    >
      <Spin spinning={isLoading}>
        <ActionBar
          createdBy={detail?.createdBy}
          createdAt={detail?.createdAt}
          updatedBy={detail?.updatedBy}
          updatedAt={detail?.updatedAt}
          actions={getActionBarActions()}
        />
        {detail && (
          <div
            className="p-4 overflow-y-auto flex-1 bg-[var(--ant-color-bg-container)]"
            style={{ height: "calc(100vh - 180px)" }}
          >
            <div className="space-y-4">
              {/* 上半部：基本資料單頭 */}
              <Card
                bordered={false}
                className="bg-[var(--ant-color-bg-container)] border border-[var(--ant-color-border-secondary)] rounded-lg shadow-sm"
              >
                <DynamicForm
                  formId="iqcBasicForm"
                  fields={fields}
                  defaultValues={defaultValues}
                  isViewMode={isReadOnly}
                  isUpdateMode={!isReadOnly}
                  hideDefaultFooter={true}
                  onSubmit={() => {
                    // 💡 只有當表單驗證完全與實物明細欄位剛性驗證通過後，才開啟品質判定與過帳彈窗
                    if (validateIqcFields()) {
                      setIsDecisionModalOpen(true);
                    }
                  }}
                />
              </Card>

              {/* 下半部：品質檢驗抽樣與實測量表 (24 滿欄顯示，提供最寬敞流暢的輸入視界) */}
              <Card
                bordered={false}
                className="bg-[var(--ant-color-bg-container)] border border-[var(--ant-color-border-secondary)] rounded-lg shadow-sm"
              >
                <div className="mb-3 flex justify-between items-center bg-[var(--ant-color-bg-layout)] px-3 py-2 rounded border border-[var(--ant-color-border-secondary)]">
                  <Space size="middle">
                    <Text strong className="text-slate-800 text-sm">
                      品質檢驗抽樣與實測量表
                    </Text>
                    <Divider type="vertical" className="border-slate-300" />
                    {!isReadOnly && (detail?.inspectionStatus === "Pending" || detail?.inspectionStatus === "FullInspecting") ? (
                      <Space size="small">
                        <Text type="secondary" className="text-xs">
                          抽檢數量 ({unitLabel}):
                        </Text>
                        <InputNumber
                          min={1}
                          max={isRollMaterial ? (detail?.rollCount || 1000) : 100000}
                          size="small"
                          value={sampleCount}
                          onChange={(v) => {
                            if (v !== null && v !== undefined) setSampleSize(v);
                          }}
                          style={{ width: 80 }}
                        />
                        <Space size={4} className="ml-1 bg-[var(--ant-color-fill-alter)] px-2 py-0.5 rounded border border-[var(--ant-color-border-secondary)]">
                          <span className="text-[10px] text-slate-400 font-medium">快捷比例:</span>
                          {(isRollMaterial ? [10, 30, 50, 100] : [1, 5, 10, 100]).map((pct) => {
                            const calculatedCount = isRollMaterial
                              ? Math.min(
                                  detail?.rollCount || 1,
                                  Math.max(1, Math.ceil(((detail?.rollCount || 0) * pct) / 100))
                                )
                              : 1; // 片料預設不按比例填充，通常自訂
                            if (!isRollMaterial && pct !== 100) return null; // 片料僅提供 100% 全檢或自訂
                            return (
                              <Button
                                key={pct}
                                size="small"
                                type="link"
                                className="text-[11px] p-0 h-auto font-bold"
                                onClick={() => {
                                  if (isRollMaterial) {
                                    setSampleSize(calculatedCount);
                                  } else {
                                    // 片料 100% 全檢為當前進貨量 (或分配組數)
                                    setSampleSize(1); // 片料預設大卡數
                                  }
                                }}
                              >
                                {pct === 100 ? "全檢" : `${pct}%`}
                              </Button>
                            );
                          })}
                        </Space>
                      </Space>
                    ) : (
                      <Text type="secondary" className="text-xs">
                        抽檢數量: {sampleCount} {unitLabel}
                      </Text>
                    )}
                  </Space>

                  <Space size="middle" className="text-xs">
                    {!isRollMaterial && !isReadOnly && (
                      <Button
                        type="primary"
                        size="small"
                        icon={<PlusOutlined />}
                        onClick={handleAddSheetRow}
                        className="bg-blue-600 hover:bg-blue-500 font-bold hover:text-white"
                        style={{ color: "#fff" }}
                      >
                        新增原廠批號行
                      </Button>
                    )}
                    <Badge
                      status="default"
                      text={isRollMaterial ? `總數: ${detail.rollCount} 卷` : `進貨總片數: ${detail.rollCount?.toLocaleString()} PCS`}
                    />
                    {isRollMaterial && (
                      <Badge
                        status="processing"
                        text={`抽檢: ${totalInspected} 卷`}
                      />
                    )}
                    <Badge status="success" text={`合格: ${isRollMaterial ? `${okCount} 卷` : `${okCount} 組`}`} />
                    <Badge status="error" text={`異常: ${isRollMaterial ? `${ngCount} 卷` : `${ngCount} 組`}`} />
                  </Space>
                </div>

                {isSheetTotalMismatched && !isReadOnly && (
                  <Alert
                    message={
                      <span className="font-bold">
                        ⚠️ 片料入庫數量分配不平衡！進貨總量: <span className="underline">{(detail?.rollCount ?? 0).toLocaleString()} PCS</span>，目前分配加總: <span className="underline text-orange-500 font-mono">{totalAllocatedPcs.toLocaleString()} PCS</span>，尚差 <span className="font-mono text-red-500 font-bold">{Math.abs((detail?.rollCount ?? 0) - totalAllocatedPcs).toLocaleString()} PCS</span>。請調整各組數量以符合帳實一致原則。
                      </span>
                    }
                    type="warning"
                    showIcon
                    className="mb-3 border-amber-300 bg-amber-50 dark:bg-amber-950/20 text-xs"
                  />
                )}

                <Table
                  dataSource={displayedRolls}
                  columns={columns}
                  rowKey="rollNo"
                  pagination={false}
                  size="small"
                  scroll={{ y: "calc(100vh - 530px)" }}
                  className="border border-[var(--ant-color-border-secondary)] rounded-md overflow-hidden"
                  rowClassName={(record) =>
                    record.isOk
                      ? ""
                      : "bg-red-500/10 dark:bg-red-950/20 text-red-500"
                  }
                />
              </Card>

              {/* 💡 1. 最終品質判定 Dialog Modal */}
              <Modal
                title={
                  <Space>
                    <ExclamationCircleOutlined
                      className={
                        ngCount > 0 ? "text-amber-500" : "text-green-500"
                      }
                    />
                    <span>最終品質判定與過帳 (QE Disposition & Post)</span>
                  </Space>
                }
                open={isDecisionModalOpen}
                onCancel={() => setIsDecisionModalOpen(false)}
                okText={
                  overallResult === "Concession" &&
                  detail?.inspectionStatus === "Pending"
                    ? "確認並啟動 100% 全檢"
                    : overallResult === "Concession"
                      ? "確認並提交特採申請"
                      : "確認過帳"
                }
                cancelText="取消"
                onOk={
                  overallResult === "Concession" &&
                  detail?.inspectionStatus === "Pending"
                    ? () => {
                        escalateMutation.mutate(undefined, {
                          onSuccess: () => {
                            setIsDecisionModalOpen(false);
                          },
                        });
                      }
                    : handleSubmit
                }
                confirmLoading={
                  overallResult === "Concession" &&
                  detail?.inspectionStatus === "Pending"
                    ? escalateMutation.isPending
                    : completeMutation.isPending
                }
                width={550}
                destroyOnClose
              >
                <div className="space-y-4 py-3">
                  <div>
                    <Text type="secondary" className="block mb-2">
                      請選擇此批品質檢驗最終判定結果：
                    </Text>
                    <Radio.Group
                      value={overallResult}
                      onChange={(e) => {
                        setOverallResult(e.target.value);
                        if (e.target.value === "Reject") {
                          setResponsibleParty(detail?.supplierCode);
                        }
                      }}
                      className="w-full flex flex-col gap-3"
                    >
                      <Radio.Button
                        value="AllPass"
                        disabled={ngCount > 0}
                        className="w-full py-2 h-auto flex flex-col items-center"
                      >
                        <CheckCircleOutlined className="text-green-500 text-lg mb-1" />
                        <Text strong className="text-green-700">
                          AllPass (全部通過)
                        </Text>
                        <Text type="secondary" className="text-xs">
                          整批無異常，全數建卡並正式入庫。
                        </Text>
                      </Radio.Button>

                      <Radio.Button
                        value="Concession"
                        disabled={ngCount === 0}
                        className="w-full py-2 h-auto flex flex-col items-center"
                      >
                        <ExclamationCircleOutlined className="text-amber-500 text-lg mb-1" />
                        <Text strong className="text-amber-700">
                          Concession (申請特採)
                        </Text>
                        <Text type="secondary" className="text-xs">
                          有瑕疵但急需/客戶允收，走會簽流程，核准後全數入庫。
                        </Text>
                      </Radio.Button>

                      <Radio.Button
                        value="Reject"
                        className="w-full py-2 h-auto flex flex-col items-center"
                      >
                        <CloseCircleOutlined className="text-red-500 text-lg mb-1" />
                        <Text strong className="text-red-700">
                          Reject (全部退回)
                        </Text>
                        <Text type="secondary" className="text-xs">
                          整批拒收退回，全數不建卡入庫，採購量全額扣回。
                        </Text>
                      </Radio.Button>
                    </Radio.Group>
                  </div>

                  {/* 當有 NG 卷判定退貨時，彈出剛性對帳與扣款警告 */}
                  {ngCount > 0 && overallResult === "Reject" && (
                    <Alert
                      type="warning"
                      showIcon
                      icon={
                        <WarningOutlined className="text-amber-600 text-lg" />
                      }
                      message={
                        <Text strong className="text-amber-800">
                          採購對帳與扣款安全防護
                        </Text>
                      }
                      description={
                        <Text type="secondary" className="text-xs block mt-1">
                          系統偵測到此批到貨判定不合格退貨。
                          過帳後將自動扣減採購單{" "}
                          <Text code>{detail?.purchaseOrderNumber}</Text>
                          已到貨量，未交量自動釋放，財務將自動扣款，避免企業資產流失。
                        </Text>
                      }
                    />
                  )}

                  {/* 特採申請前置警示與列印指引 */}
                  {overallResult === "Concession" && (
                    <Alert
                      type="info"
                      showIcon
                      message={
                        <Text strong className="text-blue-800">
                          特採過帳防護與列印說明
                        </Text>
                      }
                      description={
                        <Text type="secondary" className="text-xs block mt-1">
                          選擇特採後，系統會
                          <strong>自動帶入全部 QC 實測明細數據</strong>
                          產生「特採申請會簽單」。
                          過帳後單據狀態將進入「特採審核中」，請於列表或本單左下方
                          <strong>列印特採申請單（PDF）</strong>
                          進行各部門主管線下會簽。
                        </Text>
                      }
                    />
                  )}

                  <div>
                    <Text type="secondary" className="block mb-1">
                      品質異常判定責任歸屬 (若有):
                    </Text>
                    <Select
                      className="w-full"
                      value={responsibleParty}
                      disabled={overallResult === "AllPass"}
                      onChange={setResponsibleParty}
                      options={[
                        {
                          value: detail.supplierCode,
                          label: `供應商: ${detail.supplierName}`,
                        },
                        { value: "LOG-EXPRESS", label: "物流商責任" },
                        { value: "INTERNAL-OP", label: "內部責任" },
                      ]}
                    />
                  </div>

                  <div>
                    <Text type="secondary" className="block mb-1">
                      品檢判定說明 / NCR 處置備註:
                    </Text>
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
                    <Text type="secondary" className="block mb-1">
                      跨部門主管審查與核定意見：
                    </Text>
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
          </div>
        )}
      </Spin>
    </Drawer>
  );
}
