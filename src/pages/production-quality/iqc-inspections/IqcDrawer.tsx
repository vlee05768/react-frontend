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
  App,
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
import { getIqcFormFields } from "./IqcConfig";
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


// A pure helper function to distribute sample count to lots proportionally
const distributeSamplesHelper = (lots: any[], size: number): string[] => {
  if (lots.length === 0) return [];
  const validLots = lots.filter(l => l.supplierLotNo?.trim());
  if (validLots.length === 0) return Array(size).fill("");

  if (size < validLots.length) {
    const sorted = [...validLots].sort((a, b) => b.qty - a.qty);
    return Array.from({ length: size }).map((_, i) => sorted[i % sorted.length].supplierLotNo);
  }

  const assignments = new Map<string, number>();
  validLots.forEach(l => assignments.set(l.supplierLotNo, 1));
  let remaining = size - validLots.length;

  if (remaining > 0) {
    const totalQty = validLots.reduce((sum, l) => sum + l.qty, 0);
    if (totalQty > 0) {
      const exactShares = validLots.map(l => ({
        supplierLotNo: l.supplierLotNo,
        share: (l.qty / totalQty) * remaining
      }));

      exactShares.forEach(es => {
        const integerPart = Math.floor(es.share);
        assignments.set(es.supplierLotNo, assignments.get(es.supplierLotNo)! + integerPart);
        remaining -= integerPart;
      });

      if (remaining > 0) {
        exactShares.sort((a, b) => (b.share % 1) - (a.share % 1));
        for (let i = 0; i < remaining; i++) {
          const lotNo = exactShares[i].supplierLotNo;
          assignments.set(lotNo, assignments.get(lotNo)! + 1);
        }
      }
    }
  }

  const result: string[] = [];
  validLots.forEach(l => {
    const count = assignments.get(l.supplierLotNo) || 0;
    for (let i = 0; i < count; i++) {
      result.push(l.supplierLotNo);
    }
  });
  return result;
};

// Helper to distribute total sample size to lots proportionally and return the updated lots
const distributeSampleSizeToLotsHelper = (totalSize: number, currentLots: any[]) => {
  const validLots = currentLots.filter(l => l.supplierLotNo?.trim());
  if (validLots.length === 0) {
    return currentLots.map(l => ({ ...l, sampleQty: totalSize }));
  }

  const lotDistribution = distributeSamplesHelper(validLots, totalSize);
  const lotCounts = new Map<string, number>();
  lotDistribution.forEach(lotNo => {
    lotCounts.set(lotNo, (lotCounts.get(lotNo) || 0) + 1);
  });

  return currentLots.map(l => ({
    ...l,
    sampleQty: lotCounts.get((l.supplierLotNo || "").trim().toUpperCase()) || 0
  }));
};


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
  const { message, modal } = App.useApp();
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
  const [headerCoreDia, setHeaderCoreDia] = useState<number | null>(86);
  const [headerSupplierLot, setHeaderSupplierLot] = useState<string>("");
  const [sampleSize, setSampleSize] = useState<number>(1); // 💡 自訂抽樣數量 SampleSize
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [sheetLots, setSheetLots] = useState<any[]>([]);

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

  // ==========================================
  // 💡 捲料物理長度即時逆算公式與狀態連動 (Caliper Length Calculation Helpers)
  // ==========================================
  const calculateRollLength = useCallback((Do: number, Di: number, t: number): number => {
    if (!Do || !Di || !t) return 0;
    if (Do <= Di || t <= 0) return 0;
    const length = (Math.PI * (Math.pow(Do, 2) - Math.pow(Di, 2))) / (4000 * t);
    return Math.round(length * 10) / 10; // 四捨五入到小數點第一位，與 UI 規格 100% 物理對齊
  }, []);

  const recalculateRollLengthForRoll = useCallback((r: any, standardThickness?: number) => {
    if (!isRollMaterial) return r;

    const Do = r.measuredCoreDiaMm ?? 250.0;

    const DiItem = r.inspectionItems?.find((i: any) => i.itemCode === "core_dia");
    const Di = parseFloat(DiItem?.measuredValue) || 86.00;

    const tItem = r.inspectionItems?.find((i: any) => i.itemCode === "thickness");
    const t = parseFloat(tItem?.measuredValue) || standardThickness || 0.050;

    const calculatedMeters = calculateRollLength(Do, Di, t);

    // 同步更新 rolls 狀態中的實測長度 (length) 欄位
    const updatedItems = r.inspectionItems.map((i: any) => {
      if (i.itemCode === "length") {
        return { ...i, measuredValue: String(calculatedMeters) };
      }
      return i;
    });

    return { ...r, inspectionItems: updatedItems };
  }, [isRollMaterial, calculateRollLength]);

  const sampleCount = isReadOnlyPermanent
    ? detail?.sampleSize || rolls.length
    : sampleSize;

  const unitLabel = isRollMaterial ? "卷" : "pcs";

  const resetFormStates = useCallback(() => {
    if (detail?.rolls) {
      setLocalStatus(null); // 💡 清除本地 overrides 狀態
      setIsEditing(false); // 💡 回到唯讀檢視模式
      const dbCoreDia = detail.measuredCoreDiaMm ?? (isRollMaterial ? 86 : null);
      setHeaderCoreDia(dbCoreDia);

      const dbSupplierLot = detail.rolls?.[0]?.supplierLotNo || "";
      setHeaderSupplierLot(dbSupplierLot);

      const initialRolls = detail.rolls.map((r: any) => {
        const rollCoreDia = dbCoreDia;
        // 💡 實測外徑 (Do) 採用 measuredOuterDiaMm
        const outerDiaVal = r.measuredOuterDiaMm !== null && r.measuredOuterDiaMm !== undefined ? r.measuredOuterDiaMm : 250.0;
        // 💡 內管芯外徑 (Di) 採用 measuredCoreDiaMm
        const coreDiaVal = r.measuredCoreDiaMm ?? rollCoreDia ?? 86;
        
        // 💡 確保 inspectionItems 中一定包含 thickness, width, core_dia, length, appearance_desc 等基礎量測項
        const rawItems = r.inspectionItems || [];
        const requiredCodes = ["thickness", "width", isRollMaterial ? "core_dia" : "length"];
        const finalItems = [...rawItems];

        requiredCodes.forEach((code) => {
          if (!finalItems.some((item: any) => item.itemCode === code)) {
            let valStr = "";
            if (code === "thickness") valStr = String(r.measuredSampleThicknessMm ?? r.measuredThicknessMm ?? detail.standardThickness ?? 0.05);
            else if (code === "width") valStr = String(r.measuredWidthMm ?? detail.standardWidth ?? 150);
            else if (code === "core_dia") valStr = String(coreDiaVal);
            else if (code === "length") valStr = String(r.measuredLengthMm ?? detail.standardLength ?? 300);

            finalItems.push({
              itemCode: code,
              itemName: code === "thickness" ? "厚度(mm)" : code === "width" ? "寬度(mm)" : code === "core_dia" ? "內管芯外徑(mm)" : "長度(mm)",
              specification: "",
              measuredValue: valStr,
              isOk: true,
            });
          }
        });

        // 另外，我們也需要確保厚度和寬度、管芯等 item.measuredValue 如果為空，自動用直接欄位值同步，雙保險防丟失！
        const mappedItems = finalItems.map((item: any) => {
          let updatedVal = item.measuredValue;
          if (item.itemCode === "thickness" && (!updatedVal || updatedVal === "")) {
            updatedVal = String(r.measuredSampleThicknessMm ?? r.measuredThicknessMm ?? detail.standardThickness ?? 0.05);
          } else if (item.itemCode === "width" && (!updatedVal || updatedVal === "")) {
            updatedVal = String(r.measuredWidthMm ?? detail.standardWidth ?? 150);
          } else if (item.itemCode === "core_dia" && (!updatedVal || updatedVal === "")) {
            updatedVal = String(coreDiaVal);
          } else if (item.itemCode === "length" && (!updatedVal || updatedVal === "")) {
            updatedVal = String(r.measuredLengthMm ?? detail.standardLength ?? 300);
          }
          return { ...item, measuredValue: updatedVal };
        });

        const rollObj = {
          ...r,
          actualQtyAux: r.actualQtyAux,
          isOk: r.isOk, // 💡 嚴格讀取資料庫狀態，不判定預設 true！未檢驗時為 null
          measuredThicknessMm: r.measuredSampleThicknessMm ?? r.measuredThicknessMm ?? detail.standardThickness ?? 0.05,
          measuredSampleThicknessMm: r.measuredSampleThicknessMm ?? r.measuredThicknessMm ?? detail.standardThickness ?? 0.05,
          measuredWidthMm: r.measuredWidthMm ?? detail.standardWidth ?? 150,
          measuredOuterDiaMm: outerDiaVal, // 💡 實測外徑獨立
          measuredCoreDiaMm: coreDiaVal, // 💡 內管芯外徑獨立
          lengthMm: r.lengthMm ?? (isRollMaterial ? null : detail.standardLength),
          measuredLengthMm: r.measuredLengthMm ?? (isRollMaterial ? null : detail.standardLength),
          disposition: r.disposition || "Concession",
          responsibleParty: r.responsibleParty || detail.supplierCode,
          inspectionItems: mappedItems,
        };

        // 💡 開氣或重置品檢單時，立刻自動即時計算出實測長度並同步到 DTO 狀態
        return recalculateRollLengthForRoll(rollObj, detail.standardThickness);
      });
      setRolls(initialRolls);

      // 💡 優先從資料庫已存的 groups 中讀取原廠批號數量分配 (sheetLots)；若無則由 rolls 還原
      const initialLots: any[] = [];

      if (detail.groups && detail.groups.length > 0) {
        detail.groups.forEach((g: any, index: number) => {
          initialLots.push({
            id: g.id || `lot-${index + 1}`,
            supplierLotNo: g.supplierLotNo || "",
            qty: g.allocatedQty || 0,
            sampleQty: g.sampleQty || 0,
            measuredCoreDiaMm: g.measuredCoreDiaMm ?? (isRollMaterial ? 86 : null)
          });
        });
      } else if (detail.rolls && detail.rolls.length > 0) {
        const lotMap = new Map();
        const lotSampleMap = new Map();

        detail.rolls.forEach((r: any) => {
          const lotNo = (r.supplierLotNo || "").trim().toUpperCase() || "NO-LOT";
          const coreDia = r.measuredCoreDiaMm ?? dbCoreDia;
          const key = `${lotNo}_${coreDia}`;

          lotMap.set(key, { supplierLotNo: lotNo, coreDia });
          lotSampleMap.set(key, (lotSampleMap.get(key) || 0) + 1);
        });

        let idx = 1;
        lotSampleMap.forEach((sampleQty, key) => {
          const lotInfo = lotMap.get(key);
          const groupRolls = detail.rolls.filter((r: any) => {
            const lNo = (r.supplierLotNo || "").trim().toUpperCase() || "NO-LOT";
            const cDia = r.measuredCoreDiaMm ?? dbCoreDia;
            return lNo === lotInfo.supplierLotNo && cDia === lotInfo.coreDia;
          });

          const qty = isRollMaterial 
            ? groupRolls.length 
            : groupRolls.reduce((sum: number, r: any) => sum + (r.actualQtyAux || 0), 0);

          initialLots.push({ 
            id: `lot-${idx++}`, 
            supplierLotNo: lotInfo.supplierLotNo === "NO-LOT" ? "" : lotInfo.supplierLotNo, 
            qty, 
            sampleQty: (detail.inspectionStatus === "Pending" && isRollMaterial) ? 1 : sampleQty,
            measuredCoreDiaMm: lotInfo.coreDia
          });
        });
      }

      if (initialLots.length === 0) {
        initialLots.push({ 
          id: "lot-1", 
          supplierLotNo: "", 
          qty: detail.rollCount || 0, 
          sampleQty: 1,
          measuredCoreDiaMm: isRollMaterial ? (dbCoreDia ?? 86) : null
        });
      }
      setSheetLots(initialLots);

      const defaultInspector =
        detail.inspectorId === "PENDING" || !detail.inspectorId
          ? user?.employeeCode || ""
          : detail.inspectorId;
      setInspectorId(defaultInspector);

      // 💡 樣品量初始化：若資料庫已有存檔明細，則以存檔明細的總樣品數（各組 sampleQty 總和）為準；否則依公式初始化
      const hasExistingRolls = detail.rolls && detail.rolls.length > 0;
      if (hasExistingRolls) {
        const totalLoadedSampleSize = initialLots.reduce((sum, l) => sum + (l.sampleQty || 0), 0);
        setSampleSize(totalLoadedSampleSize || detail.sampleSize || detail.rolls.length || 1);
      } else {
        const defaultSize = 1;
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

  // 💡 確保捲材的 rolls 狀態長度至少與當前算出的 sampleCount 一致 (不足則進行動態 Pad 填充明細行)
  useEffect(() => {
    if (
      detail &&
      isRollMaterial && // 💡 僅限捲材
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
        const rollNo = `${detail.lotNo}-R${i.toString().padStart(2, "0")}`;
        newRolls.push({
          seq: i,
          rollNo: rollNo,
          actualQtyAux: detail.standardLength,
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

  // 💡 片料專屬：動態同步樣品行 (rolls) 與當前 sheetLots 中的 sampleQty 分配，同時保留與保護已輸入數據 (方案C)
  useEffect(() => {
    if (isRollMaterial || !detail || isReadOnly) return;

    // 1. Build the list of target lot items
    const targetLotItems: { lotNo: string; idx: number }[] = [];
    sheetLots.forEach(l => {
      const lotNo = (l.supplierLotNo || "NO-LOT").trim().toUpperCase();
      const sq = l.sampleQty ?? 0;
      for (let i = 0; i < sq; i++) {
        targetLotItems.push({ lotNo, idx: i });
      }
    });

    setRolls((prevRolls) => {
      const templateRoll = prevRolls[0] || (detail.rolls && detail.rolls[0]) || {
        measuredThicknessMm: detail.standardThickness ?? 0.05,
        measuredCoreDiaMm: null,
        lengthMm: detail.standardLength,
        isOk: true,
        disposition: undefined,
        responsibleParty: undefined,
        inspectionItems: [],
      };
      const defaultTemplateItems = templateRoll.inspectionItems || [];

      // Partition existing rolls by lot
      const existingRollsByLot = new Map<string, any[]>();
      prevRolls.forEach(r => {
        const lotNo = (r.supplierLotNo || "NO-LOT").trim().toUpperCase();
        if (!existingRollsByLot.has(lotNo)) {
          existingRollsByLot.set(lotNo, []);
        }
        existingRollsByLot.get(lotNo)!.push(r);
      });

      const preservedRollsByLot = new Map<string, any[]>();
      existingRollsByLot.forEach((rList, lotNo) => {
        const isEmpty = (r: any) => {
          return (r.inspectionItems || []).every((item: any) => !item.measuredValue || item.measuredValue.trim() === "");
        };
        const nonEmptyList = rList.filter(r => !isEmpty(r));
        const emptyList = rList.filter(r => isEmpty(r));
        preservedRollsByLot.set(lotNo, [...nonEmptyList, ...emptyList]);
      });

      const usedIndicesByLot = new Map<string, number>();
      const nextRolls = targetLotItems.map((item, index) => {
        const lotNo = item.lotNo;
        const usedIdx = usedIndicesByLot.get(lotNo) || 0;
        usedIndicesByLot.set(lotNo, usedIdx + 1);

        const existingList = preservedRollsByLot.get(lotNo) || [];
        const existing = existingList[usedIdx];

        const rollNo = `${detail.lotNo}-S${(index + 1).toString().padStart(2, "0")}`;

        return {
          seq: index + 1,
          rollNo,
          actualQtyAux: 0,
          supplierLotNo: lotNo,
          isOk: existing ? existing.isOk : true,
          measuredThicknessMm: existing ? existing.measuredThicknessMm : templateRoll.measuredThicknessMm,
          measuredCoreDiaMm: null,
          lengthMm: existing ? existing.lengthMm : templateRoll.lengthMm,
          disposition: existing ? existing.disposition : undefined,
          responsibleParty: existing ? existing.responsibleParty : undefined,
          inspectionItems: existing ? existing.inspectionItems : defaultTemplateItems.map((itm: any) => ({
            ...itm,
            measuredValue: "",
            isOk: true,
          })),
        };
      });

      // Guard: only return new array if it actually changed
      const rollsChanged = nextRolls.length !== prevRolls.length || nextRolls.some((r, idx) => {
        const prev = prevRolls[idx];
        return !prev || prev.supplierLotNo !== r.supplierLotNo || prev.seq !== r.seq;
      });

      return rollsChanged ? nextRolls : prevRolls;
    });
  }, [isRollMaterial, detail, isReadOnly, sheetLots]);

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
        modal.confirm({
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
      modal.confirm({
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

    // 💡 剛性檢核防呆：不允許存在原廠批號與管芯外徑完全相同的重複分組
    const uniqueKeys = new Set<string>();
    for (let idx = 0; idx < sheetLots.length; idx++) {
      const lot = sheetLots[idx];
      const cleanLotNo = (lot.supplierLotNo || "").trim().toUpperCase();
      const coreDia = lot.measuredCoreDiaMm !== null && lot.measuredCoreDiaMm !== undefined ? lot.measuredCoreDiaMm : (headerCoreDia ?? 86);
      
      const uniqueKey = isRollMaterial ? `${cleanLotNo}_${coreDia}` : cleanLotNo;
      
      if (uniqueKeys.has(uniqueKey)) {
        const errorMsg = isRollMaterial
          ? `【第一步防呆】存在重複的分組資料（原廠批號: "${cleanLotNo || "空白"}"，管芯外徑: ${coreDia} mm）！每個分組必須有唯一的批號與管芯組合。`
          : `【第一步防呆】存在重複的批號分組（原廠批號: "${cleanLotNo || "空白"}"）！不允許有重複的批號分組。`;
        message.error(errorMsg);
        return;
      }
      uniqueKeys.add(uniqueKey);
    }

    const tempSheetLots = sheetLots.map(l => ({
          ...l,
          supplierLotNo: (!l.supplierLotNo || l.supplierLotNo.trim() === "") ? "" : l.supplierLotNo.trim().toUpperCase()
        }));

    const targetRolls = isReadOnlyPermanent ? rolls : rolls.slice(0, sampleCount);

    const balancedRolls = isRollMaterial
      ? targetRolls.map(r => ({
          ...r,
          supplierLotNo: (r.supplierLotNo || "").trim().toUpperCase()
        }))
      : (() => {
          const assignedLots = new Set();
          return targetRolls.map((r) => {
            const lotNo = (r.supplierLotNo || "").trim().toUpperCase() || "";
            let qty = 0;
            if (lotNo && !assignedLots.has(lotNo)) {
              const allocated = tempSheetLots.find(l => (l.supplierLotNo || "").trim().toUpperCase() === lotNo);
              qty = allocated ? allocated.qty : 0;
              assignedLots.add(lotNo);
            }
            return {
              ...r,
              supplierLotNo: lotNo,
              actualQtyAux: qty
            };
          });
        })();

    const groupsPayload = tempSheetLots.map((lot, idx) => {
      const cleanLotNo = (lot.supplierLotNo || "").trim().toUpperCase();
      const matchLotNo = cleanLotNo || "NO-LOT";
      
      const lotRolls = balancedRolls.filter((r: any) => {
        const rLotNo = (r.supplierLotNo || "").trim().toUpperCase() || "NO-LOT";
        if (isRollMaterial) {
          const rCoreDia = r.measuredCoreDiaMm ?? headerCoreDia ?? 86;
          const lotCoreDia = lot.measuredCoreDiaMm ?? headerCoreDia ?? 86;
          return rLotNo === matchLotNo && Math.abs(rCoreDia - lotCoreDia) < 0.01;
        } else {
          return rLotNo === matchLotNo;
        }
      });

      return {
        groupSeq: idx + 1,
        supplierLotNo: cleanLotNo,
        measuredCoreDiaMm: isRollMaterial ? (lot.measuredCoreDiaMm ?? headerCoreDia ?? 86) : null,
        allocatedQty: Number(lot.qty) || 0,
        sampleQty: Number(lot.sampleQty) || 0,
        samples: lotRolls.map((r: any, rIdx: number) => ({
          seq: rIdx + 1,
          sampleNo: r.sampleNo || String(rIdx + 1).padStart(2, "0"),
          rollNo: r.rollNo || `S-${String(rIdx + 1).padStart(2, "0")}`,
          actualQtyAux: Number(r.actualQtyAux) || 1,
          isOk: r.isOk ?? true,
          measuredThicknessMm: Number(r.measuredThicknessMm) || 0.05,
          measuredSampleThicknessMm: Number(r.measuredSampleThicknessMm || r.measuredThicknessMm) || 0.05,
          measuredCoreDiaMm: isRollMaterial ? (r.measuredCoreDiaMm || null) : null,
          measuredOuterDiaMm: isRollMaterial ? (r.measuredOuterDiaMm || null) : null, // 💡 儲存實測外徑
          lengthMm: r.lengthMm || null,
          measuredLengthMm: Number(r.measuredLengthMm || r.lengthMm) || null,
          measuredWidthMm: Number(r.measuredWidthMm || r.widthMm) || null,
          disposition: r.disposition || "Concession",
          responsibleParty: r.responsibleParty || detail?.supplierCode,
          supplierLotNo: cleanLotNo,
          inspectionItems: (r.inspectionItems || []).map((item: any) => ({
            itemCode: item.itemCode,
            itemName: item.itemName,
            specification: item.specification,
            measuredValue: item.measuredValue || "",
            isOk: item.isOk ?? true,
          })),
        }))
      };
    });

    const payload = {
      inspectorId,
      incomingStorageCode: incomingStorageCode || null,
      measuredCoreDiaMm: isRollMaterial ? (headerCoreDia || null) : null, // 💡 極致純淨方案
      rolls: balancedRolls.map((r: any) => ({
        seq: r.seq,
        rollNo: r.rollNo,
        actualQtyAux: r.actualQtyAux,
        isOk: r.isOk ?? true, // 預設單項合格
        measuredThicknessMm: r.measuredThicknessMm || 0.05,
        measuredSampleThicknessMm: Number(r.measuredSampleThicknessMm || r.measuredThicknessMm) || 0.05,
        measuredCoreDiaMm: isRollMaterial ? (r.measuredCoreDiaMm || null) : null, // 💡 內管芯外徑
        measuredOuterDiaMm: isRollMaterial ? (r.measuredOuterDiaMm || null) : null, // 💡 實測外徑
        lengthMm: r.lengthMm || null,
        measuredLengthMm: Number(r.measuredLengthMm || r.lengthMm) || null,
        measuredWidthMm: Number(r.measuredWidthMm || r.widthMm) || null,
        disposition: r.isOk ? undefined : (r.disposition || "Concession"),
        responsibleParty: r.isOk ? undefined : (r.responsibleParty || detail?.supplierCode),
        supplierLotNo: r.supplierLotNo, // 💡 補回缺失的原廠生產批號
        inspectionItems: (r.inspectionItems || []).map((item: any) => ({
          itemCode: item.itemCode,
          itemName: item.itemName,
          specification: item.specification,
          measuredValue: item.measuredValue || "",
          isOk: item.isOk ?? true,
        })),
      })),
      groups: groupsPayload, // 💡 補上缺失的品檢分群列表，完美儲存 Step 1 的所有修改！
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
            const exists = r.inspectionItems.some((i: any) => i.itemCode === itemCode);
            const updatedItems = exists
              ? r.inspectionItems.map((i: any) => {
                  if (i.itemCode === itemCode) {
                    return { ...i, measuredValue: value };
                  }
                  return i;
                })
              : [
                  ...r.inspectionItems,
                  {
                    itemCode,
                    itemName: itemCode === "appearance_desc" ? "外觀自訂描述" : itemCode,
                    specification: "",
                    measuredValue: value,
                    isOk: true
                  }
                ];

            // 💡 同步更新最上端實體屬性，確保 DTO/API 儲存與物理卷卡建立之屬性 100% 正確
            const extraUpdates: any = {};
            if (itemCode === "core_dia") {
              const numVal = parseFloat(value);
              extraUpdates.measuredCoreDiaMm = isNaN(numVal) ? null : numVal;
            } else if (itemCode === "thickness") {
              const numVal = parseFloat(value);
              extraUpdates.measuredThicknessMm = isNaN(numVal) ? 0.05 : numVal;
              extraUpdates.measuredSampleThicknessMm = isNaN(numVal) ? 0.05 : numVal;
            } else if (itemCode === "width") {
              const numVal = parseFloat(value);
              extraUpdates.measuredWidthMm = isNaN(numVal) ? null : numVal;
            } else if (itemCode === "length") {
              const numVal = parseFloat(value);
              extraUpdates.measuredLengthMm = isNaN(numVal) ? null : numVal;
              extraUpdates.lengthMm = isNaN(numVal) ? null : numVal;
            }

            let finalRoll = { ...r, inspectionItems: updatedItems, ...extraUpdates };
            if (itemCode === "core_dia" || itemCode === "thickness") {
              finalRoll = recalculateRollLengthForRoll(finalRoll, detail?.standardThickness);
            }
            return finalRoll;
          }
          return r;
        }),
      );
    },
    [isReadOnly, recalculateRollLengthForRoll, detail?.standardThickness],
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



  // 3.5 重置為待檢驗狀態之 Mutation (真正呼叫後端 API 進行資料庫清空重置)
  const resetMutation = useMutation({
    mutationFn: () =>
      client.post({
        url: `/api/v1/IqcInspection/${iqcRecordId}/reset`,
      }),
    onSuccess: () => {
      message.success("已成功將此品檢單恢復為全新的待檢驗狀態！");
      setLocalStatus("Pending");
      queryClient.invalidateQueries({ queryKey: ["iqc-detail", iqcRecordId] });
      queryClient.invalidateQueries({ queryKey: ["iqc-inspections"] });
      refetch();
    },
    onError: (err: any) =>
      message.error(err.response?.data?.message || "重置待檢驗失敗"),
  });

  const handleResetToPending = () => {
    if (!detail) return;
    modal.confirm({
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

    modal.confirm({
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
      modal.confirm({
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

    // 💡 剛性檢核防呆：不允許存在原廠批號與管芯外徑完全相同的重複分組
    const uniqueKeys = new Set<string>();
    for (let idx = 0; idx < sheetLots.length; idx++) {
      const lot = sheetLots[idx];
      const cleanLotNo = (lot.supplierLotNo || "").trim().toUpperCase();
      const coreDia = lot.measuredCoreDiaMm !== null && lot.measuredCoreDiaMm !== undefined ? lot.measuredCoreDiaMm : (headerCoreDia ?? 86);
      
      const uniqueKey = isRollMaterial ? `${cleanLotNo}_${coreDia}` : cleanLotNo;
      
      if (uniqueKeys.has(uniqueKey)) {
        const errorMsg = isRollMaterial
          ? `【第一步防呆】存在重複的分組資料（原廠批號: "${cleanLotNo || "空白"}"，管芯外徑: ${coreDia} mm）！每個分組必須有唯一的批號與管芯組合。`
          : `【第一步防呆】存在重複的批號分組（原廠批號: "${cleanLotNo || "空白"}"）！不允許有重複的批號分組。`;
        message.error(errorMsg);
        return false;
      }
      uniqueKeys.add(uniqueKey);
    }

    // 💡 自動將空白批號同步為大寫，空白不強行寫入 NO-LOT
    const tempSheetLots = sheetLots.map(l => ({
          ...l,
          supplierLotNo: (!l.supplierLotNo || l.supplierLotNo.trim() === "") ? "" : l.supplierLotNo.trim().toUpperCase()
        }));

    const hasChanges = sheetLots.some(l => l.supplierLotNo && l.supplierLotNo !== l.supplierLotNo.trim().toUpperCase());
    if (hasChanges) {
      setSheetLots(tempSheetLots);
    }

    // 剛性檢核：判定與過帳時，必須每個欄位與品檢項目都有填入值
    for (let i = 0; i < displayedRolls.length; i++) {
      const r = displayedRolls[i];
      const nameLabel = isRollMaterial ? `第 ${r.seq} 卷` : `第 ${r.seq} 包/片`;

      const rollItem = r.inspectionItems?.find((itm: any) => itm.itemCode === "appearance");
      const appearanceVal = rollItem?.measuredValue || "Pass";
      const isCustom = appearanceVal === "Custom";

      if (isCustom) {
        // 💡 自訂外觀異常情境：強制檢核「自訂外觀敘述」不可為空
        const customDescItem = r.inspectionItems?.find((itm: any) => itm.itemCode === "appearance_desc");
        if (!customDescItem?.measuredValue || customDescItem.measuredValue.trim() === "") {
          message.warning(`請輸入 ${nameLabel} 的「自訂外觀異常描述」`);
          return false;
        }
      } else {
        // 💡 正常量測情境：每個抽樣實測數據都不可為空且必須大於 0

        // 1. 實測厚度 (Roll / Sheet 皆有)
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

        // 2. 實測寬度 (Roll / Sheet 皆有)
        const widthItem = r.inspectionItems?.find((itm: any) => itm.itemCode === "width");
        const widthVal = widthItem?.measuredValue;
        if (widthVal === null || widthVal === undefined || String(widthVal).trim() === "") {
          message.warning(`請輸入 ${nameLabel} 的「實測寬度」`);
          return false;
        }
        if (Number(widthVal) <= 0) {
          message.warning(`${nameLabel} 的「實測寬度」必須大於 0`);
          return false;
        }

        if (isRollMaterial) {
          // 3. 實測數量 (Roll 專屬)
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

          // 4. 內管芯外徑 (Roll 專屬)
          if (
            r.measuredCoreDiaMm === null ||
            r.measuredCoreDiaMm === undefined ||
            r.measuredCoreDiaMm === ""
          ) {
            message.warning(`請輸入 ${nameLabel} 的「內管芯外徑」`);
            return false;
          }
          if (Number(r.measuredCoreDiaMm) <= 0) {
            message.warning(`${nameLabel} 的「內管芯外徑」必須大於 0`);
            return false;
          }

          // 5. 實測外徑 (Roll 專屬)
          if (
            r.measuredOuterDiaMm === null ||
            r.measuredOuterDiaMm === undefined ||
            r.measuredOuterDiaMm === ""
          ) {
            message.warning(`請輸入 ${nameLabel} 的「實測外徑」`);
            return false;
          }
          if (Number(r.measuredOuterDiaMm) <= 0) {
            message.warning(`${nameLabel} 的「實測外徑」必須大於 0`);
            return false;
          }
        } else {
          // 6. 實測長度 (Sheet 專屬)
          const lengthItem = r.inspectionItems?.find((itm: any) => itm.itemCode === "length");
          const lengthVal = lengthItem?.measuredValue;
          if (lengthVal === null || lengthVal === undefined || String(lengthVal).trim() === "") {
            message.warning(`請輸入 ${nameLabel} 的「實測長度」`);
            return false;
          }
          if (Number(lengthVal) <= 0) {
            message.warning(`${nameLabel} 的「實測長度」必須大於 0`);
            return false;
          }
        }
      }

      // 檢核品檢細項參數 (排除隱藏的外觀描述項目以及隱藏的其他欄位)
      for (let j = 0; j < r.inspectionItems.length; j++) {
        const item = r.inspectionItems[j];
        // 如果是外觀描述項目，且外觀判定不是自訂敘述，則不檢核
        if (item.itemCode === "appearance_desc" && !isCustom) continue;
        // 如果是厚度/寬度/長度/管芯，且外觀判定是自訂敘述，則屬於隱藏欄位不檢核
        if (isCustom && ["thickness", "width", "length", "core_dia", "measuredOuterDiaMm"].includes(item.itemCode)) continue;

        if (!item.measuredValue || item.measuredValue.trim() === "") {
          message.warning(
            `請填寫 ${nameLabel} 檢驗項目【${item.itemName}】的「實測值」`,
          );
          return false;
        }
      }
    }

    // 1. 檢核 sheetLots 中的每一組批號 (使用已更正之 tempSheetLots)
    for (let k = 0; k < tempSheetLots.length; k++) {
      const lot = tempSheetLots[k];
      if (lot.qty === null || lot.qty === undefined || lot.qty <= 0) {
        message.warning(`請輸入第 ${k + 1} 組原廠批號的到貨${isRollMaterial ? "卷" : "數量"}，且必須大於 0！`);
        return false;
      }
    }

    // 2. 檢核總量是否配平
    const totalAllocated = tempSheetLots.reduce((sum, l) => sum + (Number(l.qty) || 0), 0);
    if (totalAllocated !== (detail?.rollCount ?? 0)) {
      message.warning(`${isRollMaterial ? "卷料" : "片料"}入庫數量分配不平衡！進貨總量: ${(detail?.rollCount ?? 0).toLocaleString()} ${isRollMaterial ? "卷" : "PCS"}，目前分配總量: ${totalAllocated.toLocaleString()} ${isRollMaterial ? "卷" : "PCS"}`);
      return false;
    }

    return true;
  };

  const handleSubmit = () => {
    if (!validateIqcFields()) {
      return;
    }

    const tempSheetLots = sheetLots.map(l => ({
          ...l,
          supplierLotNo: (!l.supplierLotNo || l.supplierLotNo.trim() === "") ? "" : l.supplierLotNo.trim().toUpperCase()
        }));

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
      isRollMaterial && // 💡 僅限捲材進行此項剛性檢核，片材不限
      overallResult === "Concession" &&
      displayedRolls.length < detail?.rollCount
    ) {
      message.error(
        "依 ISO 規範，若有不良品欲申請特採，必須先將剩下未檢驗的卷料全部檢驗完成！請先啟動「100% 全檢」！",
      );
      return;
    }

    // 💡 片材專屬：自動在送出時對 rolls 數量進行分攤配平，確保 LPN 剛性帳實一致
    const balancedRolls = isRollMaterial
      ? displayedRolls.map(r => ({
          ...r,
          supplierLotNo: (r.supplierLotNo || "").trim().toUpperCase() // 使用品檢員在行內輸入的原廠批號
        }))
      : (() => {
          const assignedLots = new Set();
          return displayedRolls.map((r) => {
            const lotNo = (r.supplierLotNo || "").trim().toUpperCase() || "";
            let qty = 0;
            if (lotNo && !assignedLots.has(lotNo)) {
              const allocated = tempSheetLots.find(l => (l.supplierLotNo || "").trim().toUpperCase() === lotNo);
              qty = allocated ? allocated.qty : 0;
              assignedLots.add(lotNo);
            }
            return {
              ...r,
              supplierLotNo: lotNo,
              actualQtyAux: qty
            };
          });
        })();

    const groupsPayload = tempSheetLots.map((lot, idx) => {
      const cleanLotNo = (lot.supplierLotNo || "").trim().toUpperCase();
      const matchLotNo = cleanLotNo || "NO-LOT";
      
      const lotRolls = balancedRolls.filter((r: any) => {
        const rLotNo = (r.supplierLotNo || "").trim().toUpperCase() || "NO-LOT";
        if (isRollMaterial) {
          const rCoreDia = r.measuredCoreDiaMm ?? headerCoreDia ?? 86;
          const lotCoreDia = lot.measuredCoreDiaMm ?? headerCoreDia ?? 86;
          return rLotNo === matchLotNo && Math.abs(rCoreDia - lotCoreDia) < 0.01;
        } else {
          return rLotNo === matchLotNo;
        }
      });

      return {
        groupSeq: idx + 1,
        supplierLotNo: cleanLotNo,
        measuredCoreDiaMm: isRollMaterial ? (lot.measuredCoreDiaMm ?? headerCoreDia ?? 86) : null,
        allocatedQty: Number(lot.qty) || 0,
        sampleQty: Number(lot.sampleQty) || 0,
        samples: lotRolls.map((r: any, rIdx: number) => ({
          seq: rIdx + 1,
          sampleNo: r.sampleNo || String(rIdx + 1).padStart(2, "0"),
          rollNo: r.rollNo || `S-${String(rIdx + 1).padStart(2, "0")}`,
          actualQtyAux: Number(r.actualQtyAux) || 1,
          isOk: r.isOk ?? true,
          measuredThicknessMm: Number(r.measuredThicknessMm) || 0.05,
          measuredSampleThicknessMm: Number(r.measuredSampleThicknessMm || r.measuredThicknessMm) || 0.05,
          measuredCoreDiaMm: isRollMaterial ? (r.measuredCoreDiaMm || null) : null,
          measuredOuterDiaMm: isRollMaterial ? (r.measuredOuterDiaMm || null) : null, // 💡 儲存實測外徑
          lengthMm: r.lengthMm || null,
          measuredLengthMm: Number(r.measuredLengthMm || r.lengthMm) || null,
          measuredWidthMm: Number(r.measuredWidthMm || r.widthMm) || null,
          disposition: r.disposition || "Concession",
          responsibleParty: r.responsibleParty || detail?.supplierCode,
          supplierLotNo: cleanLotNo,
          inspectionItems: (r.inspectionItems || []).map((item: any) => ({
            itemCode: item.itemCode,
            itemName: item.itemName,
            specification: item.specification,
            measuredValue: item.measuredValue || "",
            isOk: item.isOk ?? true,
          })),
        }))
      };
    });

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
      measuredCoreDiaMm: isRollMaterial ? (headerCoreDia || undefined) : undefined, // 💡 極致純淨方案
      rolls: balancedRolls.map((r) => ({
        seq: r.seq,
        rollNo: r.rollNo,
        actualQtyAux: r.actualQtyAux,
        isOk: r.isOk,
        measuredThicknessMm: r.measuredThicknessMm,
        measuredCoreDiaMm: isRollMaterial ? r.measuredCoreDiaMm : undefined, // 💡 內管芯外徑
        measuredOuterDiaMm: isRollMaterial ? r.measuredOuterDiaMm : undefined, // 💡 實測外徑
        lengthMm: r.lengthMm,
        disposition: r.isOk ? undefined : r.disposition,
        responsibleParty: r.isOk ? undefined : r.responsibleParty,
        supplierLotNo: r.supplierLotNo, // 💡 補回缺失的原廠生產批號
        inspectionItems: r.inspectionItems.map((i: any) => ({
          itemCode: i.itemCode,
          itemName: i.itemName,
          specification: i.specification,
          measuredValue: i.measuredValue || "",
          isOk: i.isOk,
        })),
      })),
      groups: groupsPayload, // 💡 補上品質過帳分群列表
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

  // ==========================================
  // 💡 批號分配表格欄位 Memo 緩存 (防止 inline columns 重新建立導致輸入框 Focus 遺失)
  // ==========================================
  const sheetLotsColumns = useMemo(() => {
    return [
      {
        title: "#",
        key: "index",
        width: 50,
        align: "center" as const,
        render: (_: any, __: any, index: number) => index + 1
      },
      {
        title: "原廠生產批號 (SupplierLotNo)",
        dataIndex: "supplierLotNo",
        key: "supplierLotNo",
        render: (val: string, record: any) => {
          if (isReadOnly) return <span className="font-mono font-bold text-[var(--ant-color-text)]">{val || <span className="text-slate-500">（空白）</span>}</span>;
          return (
            <Input
              value={val}
              size="small"
              placeholder="請輸入或掃描原廠生產批號"
              className="font-mono uppercase text-xs"
              onFocus={(e) => e.target.select()}
              onChange={(e) => {
                const cleanVal = e.target.value.replace(/[\u4e00-\u9fa5]/g, "").toUpperCase();
                setSheetLots(prev => prev.map(l => l.id === record.id ? { ...l, supplierLotNo: cleanVal } : l));
              }}
              onBlur={(e) => {
                const cleanVal = e.target.value.trim().toUpperCase();
                setSheetLots(prev => prev.map(l => l.id === record.id ? { ...l, supplierLotNo: cleanVal } : l));
              }}
            />
          );
        }
      },
      ...(isRollMaterial ? [{
        title: "內管芯外徑 (mm)",
        dataIndex: "measuredCoreDiaMm",
        key: "measuredCoreDiaMm",
        align: "right" as const,
        width: 140,
        render: (val: any, record: any) => {
          const coreDia = record.measuredCoreDiaMm ?? headerCoreDia ?? 86;
          if (isReadOnly) return <span className="font-mono font-bold">{coreDia} mm</span>;
          return (
            <InputNumber
              value={coreDia}
              size="small"
              min={0}
              precision={1}
              className="w-full text-xs font-mono"
              onFocus={(e) => e.target.select()}
              onChange={(num) => {
                setSheetLots(prev => prev.map(l => l.id === record.id ? { ...l, measuredCoreDiaMm: num || 86 } : l));
              }}
            />
          );
        }
      }] : []),
      {
        title: isRollMaterial ? "到貨卷數 (卷)" : "到貨數量 (PCS)",
        dataIndex: "qty",
        key: "qty",
        align: "right" as const,
        width: 160,
        render: (val: number, record: any) => {
          if (isReadOnly) return <span className="font-mono font-bold text-[var(--ant-color-primary)]">{val?.toLocaleString()} {isRollMaterial ? "卷" : "PCS"}</span>;
          return (
            <InputNumber
              value={val}
              size="small"
              min={1}
              className="w-full text-xs font-mono"
              onFocus={(e) => e.target.select()}
              onChange={(num) => {
                setSheetLots(prev => prev.map(l => l.id === record.id ? { ...l, qty: num || 0 } : l));
              }}
            />
          );
        }
      },
      {
        title: isRollMaterial ? "抽樣卷數 (卷)" : "抽檢數 (PCS)",
        dataIndex: "sampleQty",
        key: "sampleQty",
        align: "right" as const,
        width: 140,
        render: (val: number, record: any) => {
          const numVal = record.sampleQty ?? 0;
          if (isReadOnly) {
            return (
              <span className="font-mono font-bold text-[#52c41a]">
                {numVal} {isRollMaterial ? "卷" : "PCS"}
              </span>
            );
          }
          return (
            <InputNumber
              value={numVal}
              size="small"
              min={0}
              className="w-full text-xs font-mono"
              onFocus={(e) => e.target.select()}
              onChange={(num) => {
                const newSampleQty = num || 0;
                setSheetLots(prev => {
                  const nextLots = prev.map(l => 
                    l.id === record.id ? { ...l, sampleQty: newSampleQty } : l
                  );
                  const totalSampleCount = nextLots.reduce((sum, l) => sum + (l.sampleQty || 0), 0);
                  setSampleSize(totalSampleCount);
                  return nextLots;
                });
              }}
            />
          );
        }
      },
      ...(!isReadOnly ? [{
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
            onClick={() => {
              if (sheetLots.length <= 1) {
                message.warning("至少必須保留一組原廠批號！");
                return;
              }
              modal.confirm({
                title: "確定要刪除此原廠批號嗎？",
                content: "這會重新分攤抽樣樣品並清除已填寫的實測數據。",
                onOk: () => {
                  setSheetLots(prev => {
                    const nextLots = prev.filter(l => l.id !== record.id);
                    const totalSampleCount = nextLots.reduce((sum, l) => sum + (l.sampleQty || 0), 0);
                    setSampleSize(totalSampleCount);
                    return nextLots;
                  });
                }
              });
            }}
          />
        )
      }] : [])
    ];
  }, [isRollMaterial, isReadOnly, sheetLots, headerCoreDia]);

  // 💡 動態依範本產生檢驗項目欄位，將實測值直接行內顯示 (不帶 OK/NG 按鈕，按鈕獨立在檢驗判定列)
  const templateItems = useMemo(() => {
    return detail?.rolls?.[0]?.inspectionItems || [];
  }, [detail]);

  const columns = useMemo(() => {
    const appearanceOptions = [
      {
        value: "Pass",
        label: (
          <Space size={8}>
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#52c41a] shadow" />
            <span>正常</span>
          </Space>
        )
      },
      {
        value: "Scratch",
        label: (
          <Space size={8}>
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#faad14] shadow" />
            <span>輕微刮傷 (特採)</span>
          </Space>
        )
      },
      {
        value: "Dirty",
        label: (
          <Space size={8}>
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#ff4d4f] shadow" />
            <span>嚴重髒污 (Reject)</span>
          </Space>
        )
      },
      {
        value: "Custom",
        label: (
          <Space size={8}>
            <EditOutlined className="text-blue-500" />
            <span>自訂敘述 (請於右側輸入)</span>
          </Space>
        )
      }
    ];

    const isCustomAppearance = (record: any) => {
      const rollItem = record.inspectionItems?.find((i: any) => i.itemCode === "appearance");
      return (rollItem?.measuredValue || "Pass") === "Custom";
    };

    const baseCols = [
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
      },
      // 💡 表面外觀移到流水號後面！
      {
        title: "表面外觀 (無氣泡、髒污、摺皺)",
        key: "appearance",
        width: 220,
        align: "left" as const,
        render: (_: any, record: any) => {
          const rollItem = record.inspectionItems?.find((i: any) => i.itemCode === "appearance");
          const currentVal = rollItem?.measuredValue || "Pass";
          const customDescItem = record.inspectionItems?.find((i: any) => i.itemCode === "appearance_desc");
          const customDesc = customDescItem?.measuredValue || "";

          if (isReadOnly) {
            const option = appearanceOptions.find(o => o.value === currentVal);
            return (
              <div className="flex flex-col space-y-1">
                <span className="font-semibold text-xs text-[var(--ant-color-text)]">
                  {option ? option.label : currentVal}
                </span>
                {currentVal === "Custom" && (
                  <span className="text-xs text-slate-400 italic font-mono">
                    描述: {customDesc || "（未填寫）"}
                  </span>
                )}
              </div>
            );
          }

          return (
            <div className="w-full min-w-[180px]">
              <Select
                size="small"
                value={currentVal}
                onChange={(newVal) => {
                  handleMeasuredItemValueChange(record.rollNo, "appearance", newVal);
                }}
                options={appearanceOptions}
                className="w-full"
              />
            </div>
          );
        }
      },
      {
        title: isRollMaterial ? "原廠生產批號 (SupplierLotNo)" : "對應原廠批號 (SupplierLotNo)",
        dataIndex: "supplierLotNo",
        key: "supplierLotNo",
        width: 220,
        align: "left" as const,
        render: (val: string, record: any) => {
          if (!isRollMaterial) {
            const displayVal = val === "NO-LOT" ? "" : val;
            return (
              <Text strong className={displayVal ? "font-mono text-blue-600" : "font-mono text-slate-400 font-normal"}>
                {displayVal || "（空白）"}
              </Text>
            );
          }

          if (isReadOnly) return <span className="font-mono font-bold text-blue-600">{val || "（空白）"}</span>;
          const options = sheetLots
            .map(l => l.supplierLotNo)
            .filter(Boolean)
            .map(lot => ({ label: lot, value: lot }));

          return (
            <Select
              size="small"
              showSearch
              value={val || undefined}
              placeholder="選擇分配原廠批"
              onChange={(selectedLot) => {
                const targetLot = sheetLots.find(l => l.supplierLotNo === selectedLot);
                setRolls((prevRolls) =>
                  prevRolls.map((r) =>
                    r.rollNo === record.rollNo 
                      ? { 
                          ...r, 
                          supplierLotNo: selectedLot,
                          measuredCoreDiaMm: targetLot?.measuredCoreDiaMm ?? r.measuredCoreDiaMm
                        } 
                      : r
                  )
                );
              }}
              options={options}
              className="w-full font-mono text-blue-600"
            />
          );
        }
      },
      // 3. 實測厚度
      {
        title: `實測厚度(mm) (${detail?.standardThickness || 0.05}±0.002)`,
        key: "thickness",
        width: 130,
        align: "center" as const,
        render: (_: any, record: any) => {
          const rollItem = record.inspectionItems?.find((i: any) => i.itemCode === "thickness");
          return (
            <MeasuredInput
              rollNo={record.rollNo}
              itemCode="thickness"
              initialValue={rollItem?.measuredValue ?? ""}
              isReadOnly={isReadOnly}
              onChange={handleMeasuredItemValueChange}
            />
          );
        }
      },
      // 4. 實測寬度
      {
        title: `實測寬度(mm) (${detail?.standardWidth || 150}±0.5)`,
        key: "width",
        width: 130,
        align: "center" as const,
        render: (_: any, record: any) => {
          const rollItem = record.inspectionItems?.find((i: any) => i.itemCode === "width");
          return (
            <MeasuredInput
              rollNo={record.rollNo}
              itemCode="width"
              initialValue={rollItem?.measuredValue ?? ""}
              isReadOnly={isReadOnly}
              onChange={handleMeasuredItemValueChange}
            />
          );
        }
      }
    ];

    if (isRollMaterial) {
      // 5. 實測外徑
      baseCols.push({
        title: "實測外徑 (mm)",
        dataIndex: "measuredOuterDiaMm",
        key: "measuredOuterDiaMm",
        width: 150,
        align: "right" as const,
        render: (val: number, record: any) => (
          <InputNumber
            size="small"
            value={val !== undefined && val !== null ? val : 250.0}
            placeholder="實測外徑"
            disabled={isReadOnly}
            min={0}
            precision={1}
            style={{ width: "100%" }}
            onFocus={(e) => e.target.select()}
            onChange={(num) => {
              setRolls((prevRolls) =>
                prevRolls.map((r) => {
                  if (r.rollNo === record.rollNo) {
                    const updated = { ...r, measuredOuterDiaMm: num || 250.0 };
                    return recalculateRollLengthForRoll(updated, detail?.standardThickness);
                  }
                  return r;
                })
              );
            }}
            className="font-mono text-right w-full"
          />
        )
      });

      // 6. 實測長度
      baseCols.push({
        title: `實測長度(M) (${detail?.standardLength || 300}±5)`,
        key: "length",
        width: 140,
        align: "right" as const,
        render: (_: any, record: any) => {
          const Do = record.measuredOuterDiaMm ?? 250.0;
          const DiItem = record.inspectionItems?.find((i: any) => i.itemCode === "core_dia");
          const Di = parseFloat(DiItem?.measuredValue) || 86.00;
          const tItem = record.inspectionItems?.find((i: any) => i.itemCode === "thickness");
          const t = parseFloat(tItem?.measuredValue) || detail?.standardThickness || 0.050;

          const calculatedMeters = calculateRollLength(Do, Di, t);
          const stdLength = detail?.standardLength || 300;
          const deviation = calculatedMeters > 0 
            ? Math.round(((calculatedMeters - stdLength) / stdLength) * 1000) / 10
            : 0;

          return (
            <div className="font-mono text-right font-bold text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded border border-blue-200/50 dark:border-blue-800/50">
              <span>{calculatedMeters} M</span>
              {calculatedMeters > 0 && (
                <span className={`ml-1 text-[9px] font-semibold ${deviation >= 0 ? "text-green-600 dark:text-green-400" : "text-rose-600 dark:text-rose-400"}`}>
                  ({deviation >= 0 ? "+" : ""}{deviation}%)
                </span>
              )}
            </div>
          );
        }
      });

      // 7. 內管芯外徑
      baseCols.push({
        title: `內管芯外徑(mm) (${detail?.measuredCoreDiaMm || 86}±0.2)`,
        key: "core_dia",
        width: 130,
        align: "center" as const,
        render: (_: any, record: any) => {
          const rollItem = record.inspectionItems?.find((i: any) => i.itemCode === "core_dia");
          return (
            <MeasuredInput
              rollNo={record.rollNo}
              itemCode="core_dia"
              initialValue={rollItem?.measuredValue ?? ""}
              isReadOnly={isReadOnly}
              onChange={handleMeasuredItemValueChange}
            />
          );
        }
      });
    } else {
      // 6. 實測長度
      baseCols.push({
        title: `實測長度(mm) (${detail?.standardLength || 300}±5)`,
        key: "length",
        width: 130,
        align: "center" as const,
        render: (_: any, record: any) => {
          const rollItem = record.inspectionItems?.find((i: any) => i.itemCode === "length");
          return (
            <MeasuredInput
              rollNo={record.rollNo}
              itemCode="length"
              initialValue={rollItem?.measuredValue ?? ""}
              isReadOnly={isReadOnly}
              onChange={handleMeasuredItemValueChange}
            />
          );
        }
      });
    }

    // 9. 檢驗判定
    baseCols.push({
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



    if (isReadOnlyPermanent) {
      baseCols.push({
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

    return baseCols;
  }, [
    isReadOnly,
    isReadOnlyPermanent,
    handleMeasuredItemValueChange,
    handleStatusChange,
    detail,
    handlePrintSingleLabelPdf,
    isRollMaterial,
    sheetLots,
    headerCoreDia,
    calculateRollLength,
    recalculateRollLengthForRoll
  ]);

  const totalLength = useMemo(() => {
    if (!detail) return 0;
    return isRollMaterial
      ? (detail.rollCount || 0) * (detail.standardLength || 0)
      : (detail.rollCount || 0);
  }, [detail, isRollMaterial]);

  const totalAllocatedPcs = useMemo(() => {
    if (isRollMaterial) return 0;
    return sheetLots.reduce((sum, r) => sum + (Number(r.qty) || 0), 0);
  }, [isRollMaterial, sheetLots]);

  const isSheetTotalMismatched = !isRollMaterial && totalAllocatedPcs !== (detail?.rollCount ?? 0);

  const fields = getIqcFormFields({
    isRollMaterial,
    isReadOnly,
    setRolls,
    detail,
    inspectorId,
    setInspectorId,
    headerCoreDia,
    setHeaderCoreDia,
    incomingStorageCode,
    setIncomingStorageCode,
    totalLength
  });

  const defaultValues = useMemo(() => ({
    iqcRecordId: detail?.iqcRecordId,
    sourceDocNumber: detail?.sourceDocNumber,
    supplierLotNo: detail?.rolls?.[0]?.supplierLotNo || "",
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
    measuredCoreDiaMm: isRollMaterial ? headerCoreDia : null, // 💡 極致純淨方案：片材強設定為 null
  }), [detail, inspectorId, incomingStorageCode, headerCoreDia, isRollMaterial, headerSupplierLot]);

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
      size="85%"
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
                variant="borderless"
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

              {/* [IQC-04] 第一步 到貨原廠批號與入庫數量分配 */}
              {true && (
                <Card
                  title={
                    <div className="flex items-center space-x-2">
                      <Tag color="blue" className="rounded-full font-bold">第一步</Tag>
                      <span className="text-sm font-bold">到貨原廠批號與入庫數量分配</span>
                    </div>
                  }
                  extra={
                    <Space size="middle">
                      <span className="text-xs text-slate-500">
                        進貨總量：<strong className="font-mono text-[var(--ant-color-text)]">{(detail?.rollCount ?? 0).toLocaleString()} {isRollMaterial ? "卷" : "PCS"}</strong>
                      </span>
                      {!isReadOnly && (
                        <Button
                          type="primary"
                          size="small"
                          icon={<PlusOutlined />}
                          onClick={() => {
                            const totalAllocated = sheetLots.reduce((sum, l) => sum + (Number(l.qty) || 0), 0);
                            const remaining = Math.max(0, (detail?.rollCount ?? 0) - totalAllocated);
                            setSheetLots(prev => {
                              const nextLots = [
                                ...prev,
                                { 
                                  id: `lot-${Date.now()}`, 
                                  supplierLotNo: "", 
                                  qty: remaining, 
                                  sampleQty: 1,
                                  measuredCoreDiaMm: isRollMaterial ? 86 : null
                                }
                              ];
                              const totalSampleCount = nextLots.reduce((sum, l) => sum + (l.sampleQty || 0), 0);
                              setSampleSize(totalSampleCount);
                              return nextLots;
                            });
                          }}
                        >
                          新增批號
                        </Button>
                      )}
                    </Space>
                  }
                  variant="borderless"
                  className="bg-[var(--ant-color-bg-container)] border border-[var(--ant-color-border-secondary)] rounded-lg shadow-sm mb-4"
                  size="small"
                >
                  {/* 批號表格 */}
                  <Table
                    dataSource={sheetLots}
                    rowKey="id"
                    pagination={false}
                    size="small"
                    columns={sheetLotsColumns}
                  />
                </Card>
              )}

              {/* 下半部：品質檢驗抽樣與實測量表 (24 滿欄顯示，提供最寬敞流暢的輸入視界) */}
              <Card
                variant="borderless"
                className="bg-[var(--ant-color-bg-container)] border border-[var(--ant-color-border-secondary)] rounded-lg shadow-sm"
              >
                <div className="mb-3 flex justify-between items-center bg-[var(--ant-color-bg-layout)] px-3 py-2 rounded border border-[var(--ant-color-border-secondary)]">
                  <Space size="middle">
                    <Text strong className="text-sm">
                      品質檢驗抽樣與實測量表
                    </Text>
                    <Divider vertical className="border-slate-300" />
                    <Text type="secondary" className="text-xs font-bold text-blue-500 bg-blue-500/10 dark:bg-blue-950/40 px-2 py-0.5 rounded border border-blue-200/50 dark:border-blue-800/50">
                      抽檢數量: {sampleCount} {unitLabel}
                    </Text>
                  </Space>

                  <Space size="middle" className="text-xs">

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
                  expandable={{
                    expandedRowRender: (record) => {
                      const customDescItem = record.inspectionItems?.find((i: any) => i.itemCode === "appearance_desc");
                      const customDesc = customDescItem?.measuredValue || "";
                      return (
                        <div className="py-2.5 px-4 bg-amber-500/5 dark:bg-amber-950/20 border border-amber-300/30 rounded flex items-center space-x-3 w-full">
                          <span className="text-xs font-bold text-amber-500 flex-shrink-0">自訂外觀異常描述:</span>
                          <Input
                            size="small"
                            disabled={isReadOnly}
                            placeholder="請輸入自訂外觀異常描述（如：背面有黑點、髒污、膠水溢出...）"
                            value={customDesc}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => {
                              handleMeasuredItemValueChange(record.rollNo, "appearance_desc", e.target.value);
                            }}
                            className="w-full text-xs font-mono border-amber-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-amber-50/20 dark:bg-amber-950/10 text-[var(--ant-color-text)]"
                          />
                        </div>
                      );
                    },
                    rowExpandable: (record) => {
                      const rollItem = record.inspectionItems?.find((itm: any) => itm.itemCode === "appearance");
                      return (rollItem?.measuredValue || "Pass") === "Custom";
                    },
                    expandedRowKeys: displayedRolls
                      .filter(r => {
                        const rollItem = r.inspectionItems?.find((itm: any) => itm.itemCode === "appearance");
                        return (rollItem?.measuredValue || "Pass") === "Custom";
                      })
                      .map(r => r.rollNo),
                    showExpandColumn: false, // 隱藏預設的 '+' 展開按鈕欄，保持極致的高對齊
                  }}
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
                destroyOnHidden
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
                      onFocus={(e) => e.target.select()}
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
                destroyOnHidden
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
                      onFocus={(e) => e.target.select()}
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
