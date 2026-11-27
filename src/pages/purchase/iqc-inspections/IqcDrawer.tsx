// @ts-nocheck
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { markNewBlankSample, canRemoveBlankSamples, updateSampleGroupLot } from "./iqcSamplingGuard";
import { validateGroupSubmission } from "./iqcGroupSubmissionGuard";
import { parseProductionQuantity } from "./productionQuantity";
import { isProductionPostingPaused } from "./productionPostingPolicy";
import { allocateSheetGroupQuantities } from "./iqcSheetQuantityAllocation";
import {
  Drawer,
  Card,
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
import Table from '@/components/Table/ErpTable';
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
import { getApiMutationErrorMessage } from "@/utils/apiErrorDisplay";
import { getIqcFormFields } from "./IqcConfig";
import { DynamicForm } from "@/components/Form/DynamicForm";
import { ActionBar } from "@/components/common/ActionBar";

const { Title, Text } = Typography;

const positiveMeasurement = (value: unknown): number | null => {
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (typeof value === "string" && !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value.trim())) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};
const normalizeAppearance = (value: unknown): "Pass" | "NG" | null => {
  if (value == null || value === "") return null;
  return value === "Pass" || value === "正常" ? "Pass" : "NG";
};


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
        onChange(rollNo, itemCode, val);
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
        className={`${isText ? "w-full min-w-[180px] text-left px-2" : "w-32 text-left pl-2"} focus:ring-2 focus:ring-blue-400 focus:outline-none rounded`}
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
  const { user, hasPermission } = useAuthStore();
  const canReviewConcession = hasPermission?.("Purchase.IqcInspections.ConcessionReview") ?? false;
  const canCancelConfirm = hasPermission?.("Purchase.IqcInspections.CancelConfirm") ?? false;
  const [rolls, setRolls] = useState<any[]>([]);
  const [overallResult, setOverallResult] = useState<
    "AllPass" | "Concession" | "Reject" | "Partial"
  >("AllPass");
  const [productionGoodQuantity, setProductionGoodQuantity] = useState<string | null>(null);
  const [productionDefectQuantity, setProductionDefectQuantity] = useState<string | null>(null);
  const [inspectorId, setInspectorId] = useState("");
  const [notes, setNotes] = useState("");
  const [responsibleParty, setResponsibleParty] = useState("");
  const [incomingStorageCode, setIncomingStorageCode] = useState("");
  const [standardCoreDia, setStandardCoreDia] = useState<number | null>(null);
  const [headerSupplierLot, setHeaderSupplierLot] = useState<string>("");
  const [sampleSize, setSampleSize] = useState<number>(1); // 💡 自訂抽樣數量 SampleSize
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [sheetLots, setSheetLots] = useState<any[]>([]);
  // Capture group membership before editing: intermediate lot strings can match another group.
  const editingLotRolls = useRef<{ id: string; rollNos: Set<string> } | null>(null);

  // 💡 UX控制彈窗狀態
  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [standardLength, setStandardLength] = useState<number | null>(null);

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

  // 生產來源的標準只信任製令保存的快照，不採用其他欄位的推測值。
  const rawDetail = response?.data?.data as (NonNullable<typeof response>['data']['data'] & {
    semiFinishedInspectionSpec?: { materialForm: "R" | "S" | null; standardThicknessMm: number | null; standardWidthMm: number | null; standardLength: number | null; items: Array<{ itemCode: string; itemName: string; specification: string; standardValue: number | null; tolerance: number | null; unit: string | null }> } | null;
    productionTotalQuantity?: number | null; productionGoodQuantity?: number | null; productionDefectQuantity?: number | null; productionQuantityUnit?: "m" | "PCS" | null;
  }) | undefined;
  const detail = useMemo(() => rawDetail?.inspectionType === "Production"
    ? { ...rawDetail, standardThickness: rawDetail.semiFinishedInspectionSpec?.standardThicknessMm ?? undefined, standardWidth: rawDetail.semiFinishedInspectionSpec?.standardWidthMm ?? undefined, standardLength: rawDetail.semiFinishedInspectionSpec?.standardLength ?? undefined }
    : rawDetail, [rawDetail]);

  const currentStatus = localStatus || detail?.inspectionStatus || "Pending";
  const isReadOnlyPermanent =
    currentStatus !== "Pending" && currentStatus !== "FullInspecting";
  const isReadOnly = isReadOnlyPermanent || !isEditing;
  const isRollMaterial = detail?.materialForm === "R"; // R=捲材, S=片材
  const isCompletedAndPosted =
    currentStatus === "AllPass" ||
    currentStatus === "ConcessionApproved" ||
    currentStatus === "Partial";

  // ==========================================
  // 💡 捲料物理長度即時逆算公式與狀態連動 (Caliper Length Calculation Helpers)
  // ==========================================
  const calculateRollLength = useCallback((DoInput: any, DiInput: any, tInput: any): number => {
    // 💡 剛性防呆：強制轉為 Number，防範 JavaScript "120.0" <= "86.0" 進行 Alphabetical 字母比較導致恆為 True 的惡性 Bug！
    const Do = Number(DoInput);
    const Di = Number(DiInput);
    const t = Number(tInput);

    if (positiveMeasurement(DoInput) == null || positiveMeasurement(DiInput) == null || positiveMeasurement(tInput) == null) return 0;
    if (Do <= Di || t <= 0) return 0;
    const length = (Math.PI * (Math.pow(Do, 2) - Math.pow(Di, 2))) / (4000 * t);
    return Number.isFinite(length) ? Math.round(length * 10) / 10 : 0; // 四捨五入到小數點第一位，與 UI 規格 100% 物理對齊
  }, []);

  const recalculateRollLengthForRoll = useCallback((r: any, _standardThickness?: number, preserveExisting = false) => {
    if (!isRollMaterial) return r;

    const Do = Number(r.measuredOuterDiaMm);

    const Di = Number(r.measuredCoreDiaMm ?? r.inspectionItems?.find((i: any) => i.itemCode === "core_dia")?.measuredValue);
    const t = positiveMeasurement(_standardThickness ?? detail?.standardThickness);

    const calculatedMeters = calculateRollLength(Do, Di, t);
    if (!calculatedMeters) return preserveExisting ? r : { ...r, measuredLengthMm: null, lengthMm: null, inspectionItems: r.inspectionItems.map((i: any) => i.itemCode === "length" ? { ...i, measuredValue: "" } : i) };

    // 同步更新 rolls 狀態中的實測長度 (length) 欄位
    const updatedItems = r.inspectionItems.map((i: any) => {
      if (i.itemCode === "length") {
        return { ...i, measuredValue: String(calculatedMeters) };
      }
      return i;
    });

    return { 
      ...r, 
      inspectionItems: updatedItems,
      measuredLengthMm: calculatedMeters, // 💡 剛性同步：將逆算出的長度（公尺）直接同步更新到最上端屬性
      lengthMm: calculatedMeters,         // 💡 同步長度屬性，保障儲存與 IQC 過帳正常
    };
  }, [isRollMaterial, calculateRollLength, detail?.standardThickness]);

  const sampleCount = isReadOnlyPermanent
    ? detail?.sampleSize || rolls.length
    : sampleSize;

  const unitLabel = isRollMaterial ? "卷" : "pcs";

  const resetFormStates = useCallback(() => {
    if (detail?.rolls) {
      setLocalStatus(null); // 💡 清除本地 overrides 狀態
      setIsEditing(false); // 💡 回到唯讀檢視模式
      const dbStandardCoreDia = detail.standardCoreDiaMm ?? null;
      setStandardCoreDia(dbStandardCoreDia);

      const dbSupplierLot = detail.rolls?.[0]?.supplierLotNo || "";
      setHeaderSupplierLot(dbSupplierLot);

      // Only a completely blank inspection creates a new group and its own sample.
      // Existing groups or samples are never matched by lot number or position.
      const blankInspection = detail.rolls.length === 0 && !(detail.groups?.length);
      const sourceRolls = blankInspection ? [{
        seq: 1, rollNo: `${detail.lotNo}-${isRollMaterial ? "R" : "S"}01`,
        supplierLotNo: "", isOk: null, inspectionItems: [],
        actualQtyAux: isRollMaterial ? detail.standardLength : 0,
      }] : detail.rolls;

      // 💡 優先從資料庫已存的 groups 中讀取原廠批號數量分配 (sheetLots)；若無則由 sourceRolls 還原
      const initialLots: any[] = [];

      if (detail.groups && detail.groups.length > 0) {
        detail.groups.forEach((g: any, index: number) => {
          initialLots.push({
            id: g.id || `lot-${index + 1}`,
            supplierLotNo: g.supplierLotNo || "",
            qty: g.allocatedQty || 0,
            sampleQty: g.sampleQty || 0
          });
        });
      } else if (sourceRolls && sourceRolls.length > 0) {
        const lotSampleMap = new Map();

        sourceRolls.forEach((r: any) => {
          const lotNo = (r.supplierLotNo || "").trim().toUpperCase() || "NO-LOT";
          lotSampleMap.set(lotNo, (lotSampleMap.get(lotNo) || 0) + 1);
        });

        let idx = 1;
        lotSampleMap.forEach((sampleQty, lotNo) => {
          const groupRolls = sourceRolls.filter((r: any) =>
            ((r.supplierLotNo || "").trim().toUpperCase() || "NO-LOT") === lotNo
          );

          const qty = isRollMaterial 
            ? (detail.rollCount || groupRolls.length)
            : groupRolls.reduce((sum: number, r: any) => sum + (r.actualQtyAux || 0), 0);

          initialLots.push({ 
            id: `lot-${idx++}`, 
            supplierLotNo: lotNo === "NO-LOT" ? "" : lotNo,
            qty,
            sampleQty: (detail.inspectionStatus === "Pending" && isRollMaterial) ? 1 : sampleQty
          });
        });
      }

      if (initialLots.length === 0) {
        initialLots.push({ 
          id: "lot-1", 
          supplierLotNo: "", 
          qty: detail.rollCount || 0, 
          sampleQty: 1
        });
      }

      const effectiveSourceRolls = (isRollMaterial && detail.inspectionStatus === "Pending" && !detail.groups?.length && sourceRolls.every((r: any) => !r.sampleId) && initialLots.length === 1 && sourceRolls.length > (initialLots[0]?.sampleQty ?? 1))
        ? sourceRolls.slice(0, initialLots[0].sampleQty)
        : sourceRolls;

      const initialRolls = effectiveSourceRolls.map((r: any) => {
        // 💡 實測外徑 (Do) 採用 measuredOuterDiaMm
        const outerDiaVal = r.measuredOuterDiaMm ?? null;
        // 💡 內管芯外徑 (Di) 採用 measuredCoreDiaMm
        const coreDiaVal = r.measuredCoreDiaMm ?? null;
        
        // 💡 確保 inspectionItems 中一定包含 thickness, width, core_dia, length, appearance_desc 等基礎量測項
        const rawItems = r.inspectionItems || [];
        const requiredCodes = ["thickness", "width", isRollMaterial ? "core_dia" : "length"];
        const finalItems = [...rawItems];

        requiredCodes.forEach((code) => {
          if (!finalItems.some((item: any) => item.itemCode === code)) {
            let valStr = "";
            if (code === "thickness") valStr = String(r.measuredSampleThicknessMm ?? "");
            else if (code === "width") valStr = String(r.measuredWidthMm ?? "");
            else if (code === "core_dia") valStr = String(r.measuredCoreDiaMm ?? "");
            else if (code === "length") valStr = String(r.measuredLengthMm ?? "");

            finalItems.push({
              itemCode: code,
              itemName: code === "thickness" ? "厚度(mm)" : code === "width" ? "寬度(mm)" : code === "core_dia" ? "內管芯外徑(mm)" : "長度(mm)",
              specification: "",
              measuredValue: valStr,
              isOk: null,
            });
          }
        });

        // 既存細項的空值必須保留，不能用規格或預設值冒充實測。
        const mappedItems = finalItems.map((item: any) => ({
          ...item,
          measuredValue: item.itemCode === "appearance"
            ? normalizeAppearance(r.appearance ?? item.measuredValue)
            : item.measuredValue,
        }));
        const currentAppearance = normalizeAppearance(r.appearance ?? mappedItems.find((item: any) => item.itemCode === "appearance")?.measuredValue);

        const groups = detail.groups || [];
        const explicitGroups = groups.flatMap((g: any) => (g.samples || []).filter((s: any) => r.sampleId && s.sampleId === r.sampleId).map(() => g));
        const group = explicitGroups.length === 1 ? explicitGroups[0] : undefined;

        let groupId: string | undefined;
        let groupAmbiguous: boolean;

        if (r.sampleId) {
          // 既存持久化樣品：嚴格以 sampleId 匹配群組
          groupId = group?.id || undefined;
          groupAmbiguous = explicitGroups.length !== 1 || !group?.id;
        } else if (blankInspection || initialLots.length === 1) {
          // 全新檢驗單或單一分組：樣品明確關聯至該分組
          groupId = initialLots[0]?.id || "lot-1";
          groupAmbiguous = false;
        } else {
          // 多分組且無 sampleId：依批號匹配
          const rLot = (r.supplierLotNo || "").trim().toUpperCase();
          if (rLot !== "") {
            const matchingLots = initialLots.filter(l => (l.supplierLotNo || "").trim().toUpperCase() === rLot);
            groupId = matchingLots.length === 1 ? matchingLots[0].id : undefined;
            groupAmbiguous = matchingLots.length !== 1;
          } else {
            const emptyLots = initialLots.filter(l => !(l.supplierLotNo || "").trim());
            groupId = emptyLots.length === 1 ? emptyLots[0].id : undefined;
            groupAmbiguous = emptyLots.length !== 1;
          }
        }

        const assignedLot = initialLots.find(l => l.id === groupId);
        const resolvedSupplierLotNo = r.supplierLotNo || (groupId && assignedLot?.supplierLotNo ? assignedLot.supplierLotNo : "");

        const rollObj = {
          ...r,
          supplierLotNo: resolvedSupplierLotNo,
          _groupId: groupId,
          _groupAmbiguous: groupAmbiguous,
          actualQtyAux: r.actualQtyAux,
          isOk: r.isOk,
          defectReason: r.defectReason ?? null,
          appearance: currentAppearance,
          ...(r.measuredSampleThicknessMm !== undefined ? { measuredSampleThicknessMm: r.measuredSampleThicknessMm } : {}),
          measuredWidthMm: r.measuredWidthMm ?? null,
          measuredOuterDiaMm: outerDiaVal, // 💡 實測外徑獨立
          measuredCoreDiaMm: coreDiaVal, // 💡 內管芯外徑獨立
          lengthMm: r.lengthMm ?? null,
          measuredLengthMm: r.measuredLengthMm ?? null,
          disposition: r.disposition || "Concession",
          responsibleParty: r.responsibleParty || detail.supplierCode,
          inspectionItems: mappedItems,
        };

        // 💡 開氣或重置品檢單時，立刻自動即時計算出實測長度並同步到 DTO 狀態
        const initialized = recalculateRollLengthForRoll(rollObj, detail.standardThickness, true);
        const isNewBlank = !r.sampleId && r.isOk == null;
        return isNewBlank ? markNewBlankSample(initialized) : initialized;
      });

      setSheetLots(initialLots);
      setRolls(initialRolls);
      const totalSampleCount = initialLots.reduce((sum, l) => sum + (l.sampleQty || 0), 0);
      setSampleSize(totalSampleCount);

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
      setStandardLength(detail.standardLength ?? null);
      setProductionGoodQuantity(detail.productionGoodQuantity?.toString() ?? null);
      setProductionDefectQuantity(detail.productionDefectQuantity?.toString() ?? null);

      const hasNgRoll = detail.rolls?.some((r: any) => r.isOk === false);
      const isCustReceipt = Boolean(detail.sourceDocNumber?.startsWith("CR") && detail.inspectionType !== "Production");
      const defaultNgDisposition = isCustReceipt ? "Reject" : "Concession";

      const defResult =
        detail.inspectionStatus === "Pending"
          ? (hasNgRoll && detail.inspectionType !== "Production" ? defaultNgDisposition : "AllPass")
          : detail.inspectionStatus === "FullInspecting"
            ? (hasNgRoll && detail.inspectionType !== "Production" ? defaultNgDisposition : "AllPass")
            : detail.inspectionStatus === "Partial"
              ? "Partial"
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

  // Only an explicit group action may create a roll with known membership.
  const createRollSamples = (groupId: string, count: number) => {
    if (!detail || !Number.isSafeInteger(count) || count <= 0) return;
    setRolls(prev => {
      const template = prev[0] || { disposition: "Concession", responsibleParty: detail.supplierCode, inspectionItems: [] };
      const next = [...prev];
      const used = new Set(prev.map(r => r.rollNo));
      let seq = Math.max(0, ...prev.map(r => Number.isSafeInteger(r.seq) ? r.seq : 0)) + 1;
      for (let i = 0; i < count; i++) {
        let rollNo: string;
        do { rollNo = `${detail.lotNo}-${isRollMaterial ? "R" : "S"}${String(seq++).padStart(2, "0")}`; } while (used.has(rollNo));
        used.add(rollNo);
        next.push(markNewBlankSample({
          seq: seq - 1, rollNo, _groupId: groupId, _groupAmbiguous: false,
          actualQtyAux: isRollMaterial ? detail.standardLength : 0, supplierLotNo: sheetLots.find(l => l.id === groupId)?.supplierLotNo || "", isOk: null,
          measuredCoreDiaMm: null, lengthMm: null, disposition: template.disposition,
          responsibleParty: template.responsibleParty,
          inspectionItems: (template.inspectionItems || []).map((item: any) => ({
            ...item, inspectionItemId: undefined, judgmentChangeReason: undefined, measuredValue: "", isOk: null,
          })),
        }));
      }
      return next;
    });
  };

  // Production 完成過帳的呈現與 handler 共用政策 seam；草稿編輯不受影響，全檢與特採另維持 fail-closed。
  const isProductionDispositionPaused = () =>
    detail?.inspectionType === "Production" && isProductionPostingPaused();

  // 僅沿用既有路由檢視權限，不代表後端授權；未知權限一律拒絕。
  // 延遲確認可能保留舊 closure，故送出時讀取 query cache 與 store 的即時值。
  const getDispositionBlockReason = (action: "complete" | "escalate" | "concession" = "complete") => {
    const latest = queryClient.getQueryData<typeof response>(["iqc-detail", iqcRecordId])?.data?.data;
    if (!open || !iqcRecordId || !latest ||
        !["Pending", "FullInspecting"].includes(latest.inspectionStatus) ||
        (localStatus && !["Pending", "FullInspecting"].includes(localStatus)) ||
        (action === "escalate" && latest.inspectionStatus !== "Pending")) {
      return "品檢單狀態已變更，目前無法進行此處置，請重新確認。";
    }
    if (!hasPermission?.("Purchase.IqcInspections.View")) {
      return "目前已無此品檢單的操作權限，請重新確認權限。";
    }
    if (latest.inspectionType === "Production") {
      if (action !== "complete") {
        return "Production 全檢與特採目前暫停，請保留草稿並等待後端支援。";
      }
      if (isProductionPostingPaused()) {
        return "Production 過帳目前暫停，請保留草稿並等待後端支援。";
      }
    }
    return null;
  };

  const guardDisposition = (action: "complete" | "escalate" | "concession" = "complete") => {
    const reason = getDispositionBlockReason(action);
    if (!reason) return false;
    message.warning(reason);
    if (!isProductionDispositionPaused()) setIsDecisionModalOpen(false);
    return true;
  };

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
      message.error(getApiMutationErrorMessage(err, "升級全檢失敗")),
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
      } else if (detail?.inspectionType === "Production") {
        message.success("生產品質判定已過帳。");
      } else {
        message.success("品質檢驗判定已整批拒收過帳。已自動回彈採購單已到貨量。");
      }
      setIsEditing(false); // 💡 結案後回到唯讀狀態
      setLocalStatus(overallResult === "Concession" ? "Concession" : overallResult); // 💡 立即變更本地狀態
      queryClient.invalidateQueries({ queryKey: ["iqc-detail", iqcRecordId] });
      queryClient.invalidateQueries({ queryKey: ["iqc-inspections"] });
      refetch();
    },
    onError: (err: any) =>
      message.error(getApiMutationErrorMessage(err, "過帳失敗，請重試")),
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
      message.error(getApiMutationErrorMessage(err, "核准特採失敗")),
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
      message.error(getApiMutationErrorMessage(err, "拒絕特採失敗")),
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
      message.error(getApiMutationErrorMessage(err, "儲存草稿失敗，請重試")),
  });

  const validateRevisionAndReasons = () => {
    if (!Number.isSafeInteger(detail?.revision)) {
      message.warning("缺少資料版本，請重新載入後再試。");
      return false;
    }
    return true;
  };

  const resolveSampleGroups = (samples: any[], lots: any[]) => {
    const error = validateGroupSubmission(samples, lots);
    if (error) {
      message.error(error);
      return null;
    }
    return samples;
  };

  const currentAppearanceFor = (sample: any): "Pass" | "NG" | null => normalizeAppearance(
    sample.appearance ?? sample.inspectionItems?.find((item: any) => item.itemCode === "appearance")?.measuredValue
  );

  const serializeSample = (sample: any, overrides: any = {}) => ({
    sampleId: sample.sampleId,
    seq: sample.seq,
    sampleNo: sample.sampleNo,
    rollNo: sample.rollNo,
    actualQtyAux: sample.actualQtyAux,
    isOk: sample.isOk ?? null,
    defectReason: sample.isOk === false ? (String(sample.defectReason || "").trim() || null) : null,
    appearance: currentAppearanceFor(sample),
    measuredSampleThicknessMm: sample.measuredSampleThicknessMm ?? null,
    measuredWidthMm: sample.measuredWidthMm ?? null,
    measuredCoreDiaMm: isRollMaterial ? (sample.measuredCoreDiaMm ?? null) : null,
    measuredOuterDiaMm: isRollMaterial ? (sample.measuredOuterDiaMm ?? null) : null,
    measuredLengthMm: sample.measuredLengthMm ?? null,
    lengthMm: sample.lengthMm ?? null,
    disposition: sample.isOk === false ? (sample.disposition || "Concession") : undefined,
    responsibleParty: sample.isOk === false ? (sample.responsibleParty || detail?.supplierCode) : undefined,
    supplierLotNo: sample.supplierLotNo,
    inspectionItems: (sample.inspectionItems || [])
      .filter((item: any) => item.itemCode !== "appearance_desc")
      .map((item: any) => ({
        inspectionItemId: item.inspectionItemId,
        itemCode: item.itemCode,
        itemName: item.itemName,
        specification: item.specification,
        measuredValue: item.itemCode === "appearance" ? (currentAppearanceFor(sample) || "") : (item.measuredValue || ""),
        isOk: null,
      })),
    ...overrides,
  });

  const handleSaveDraft = () => {
    if (!validateRevisionAndReasons()) return;
    if (!resolveSampleGroups(rolls, sheetLots)) return;
    // 草稿允許自由調整抽樣數；縮減時仍由各分組的穩定身分與尾端安全移除規則保護。
    if (!inspectorId) {
      message.warning("請輸入品檢人員員工工號");
      return;
    }

    // 卷料保留既有批號／管芯組合檢核；片料以可信群組身分隔離，批號不作為身分。
    const uniqueKeys = new Set<string>();
    for (let idx = 0; idx < sheetLots.length; idx++) {
      const lot = sheetLots[idx];
      const cleanLotNo = (lot.supplierLotNo || "").trim().toUpperCase();
      const uniqueKey = isRollMaterial ? cleanLotNo : lot.id;
      
      if (uniqueKeys.has(uniqueKey)) {
        const errorMsg = isRollMaterial
          ? `【第一步防呆】存在重複的原廠批號「${cleanLotNo || "空白"}」！每個卷料分組必須使用唯一批號。`
          : "分組識別碼缺失或重複，請重新載入並確認分組。";
        message.error(errorMsg);
        return;
      }
      uniqueKeys.add(uniqueKey);
    }

    if (detail.inspectionType === "Production" && [productionGoodQuantity, productionDefectQuantity].some(v => v != null && parseProductionQuantity(v, detail.productionQuantityUnit) === null)) {
      message.warning("生產數量須為非負 decimal(18,4)，且不可失真；PCS 須為整數。");
      return;
    }
    const tempSheetLots = sheetLots.map(l => ({
          ...l,
          supplierLotNo: (!l.supplierLotNo || l.supplierLotNo.trim() === "") ? "" : l.supplierLotNo.trim().toUpperCase()
        }));

    const targetRolls = rolls;

    const balancedRolls = isRollMaterial
      ? targetRolls.map(r => ({
          ...r,
          supplierLotNo: (r.supplierLotNo || "").trim().toUpperCase()
        }))
      : allocateSheetGroupQuantities(targetRolls, tempSheetLots);

    const resolvedRolls = resolveSampleGroups(balancedRolls, tempSheetLots);
    if (!resolvedRolls) return;
    const groupsPayload = tempSheetLots.map((lot, idx) => {
      const cleanLotNo = (lot.supplierLotNo || "").trim().toUpperCase();
      const lotRolls = resolvedRolls.filter((r: any) => r._groupId === lot.id);

      return {
        groupSeq: idx + 1,
        supplierLotNo: cleanLotNo,
        allocatedQty: Number(lot.qty) || 0,
        sampleQty: Number(lot.sampleQty) || 0,
        samples: lotRolls.map((r: any, rIdx: number) => serializeSample(r, {
          seq: rIdx + 1,
          sampleNo: r.sampleNo || String(rIdx + 1).padStart(2, "0"),
          rollNo: r.rollNo || `S-${String(rIdx + 1).padStart(2, "0")}`,
          supplierLotNo: cleanLotNo,
        }))
      };
    });

    const payload = {
      expectedRevision: detail.revision,
      inspectorId,
      incomingStorageCode: incomingStorageCode || null,
      standardCoreDiaMm: isRollMaterial ? (standardCoreDia ?? null) : null,
      measuredCoreDiaMm: null,
      ...(detail.inspectionType === "Production" ? {
        ...(productionGoodQuantity !== (detail.productionGoodQuantity?.toString() ?? null) ? { productionGoodQuantity: productionGoodQuantity === null ? null : parseProductionQuantity(productionGoodQuantity, detail.productionQuantityUnit) } : {}),
        ...(productionDefectQuantity !== (detail.productionDefectQuantity?.toString() ?? null) ? { productionDefectQuantity: productionDefectQuantity === null ? null : parseProductionQuantity(productionDefectQuantity, detail.productionQuantityUnit) } : {}),
      } : { standardLength: standardLength || null }),
      rolls: balancedRolls.map((r: any) => serializeSample(r)),
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
                    isOk: null
                  }
                ];

            // 💡 同步更新最上端實體屬性，確保 DTO/API 儲存與物理卷卡建立之屬性 100% 正確
            const extraUpdates: any = {};
            if (itemCode === "appearance") {
              extraUpdates.appearance = normalizeAppearance(value);
            } else if (itemCode === "core_dia") {
              extraUpdates.measuredCoreDiaMm = positiveMeasurement(value);
            } else if (itemCode === "thickness") {
              const numVal = positiveMeasurement(value);
              extraUpdates.measuredSampleThicknessMm = numVal;
            } else if (itemCode === "width") {
              const numVal = positiveMeasurement(value);
              extraUpdates.measuredWidthMm = numVal;
            } else if (itemCode === "length") {
              const numVal = positiveMeasurement(value);
              extraUpdates.measuredLengthMm = numVal;
              extraUpdates.lengthMm = numVal;
            }

            let finalRoll = { ...r, inspectionItems: updatedItems, ...extraUpdates };
            if (itemCode === "core_dia") {
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
              defectReason: isOk ? null : r.defectReason ?? null,
              disposition: isOk ? undefined : "Concession",
              responsibleParty: isOk ? undefined : detail?.supplierCode,
              // 樣品與細項是獨立判定，不能連動覆寫既有細項結果。
            };
          }
          return r;
        });

        const hasNg = updated.some((r) => r.isOk === false);
        const isCustReceipt = Boolean(detail?.sourceDocNumber?.startsWith("CR") && detail?.inspectionType !== "Production");
        if (detail?.inspectionType !== "Production") {
          setOverallResult(hasNg ? (isCustReceipt ? "Reject" : "Concession") : "AllPass");
        }
        return updated;
      });
    },
    [isReadOnly, detail?.supplierCode, detail?.sourceDocNumber, detail?.inspectionType],
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
      message.error(getApiMutationErrorMessage(err, "重置待檢驗失敗")),
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
      const errMsg = getApiMutationErrorMessage(err, "取消過帳失敗");
      modal.error({
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
              取消過帳原因（選填）：
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
      if (displayedRolls.some(r => r.isOk === false) && overallResult === "AllPass") {
        const isCustReceipt = Boolean(detail?.sourceDocNumber?.startsWith("CR") && detail?.inspectionType !== "Production");
        setOverallResult(isCustReceipt ? "Reject" : "Concession");
      }
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

        {canReviewConcession && detail?.inspectionStatus === "ConcessionPending" && (
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

        {canCancelConfirm && isReadOnly &&
          (detail?.inspectionStatus === "AllPass" ||
            detail?.inspectionStatus === "Partial" ||
            detail?.inspectionStatus === "Reject" ||
            (detail?.inspectionType !== "Production" &&
              (detail?.inspectionStatus === "ConcessionApproved" ||
                detail?.inspectionStatus === "ConcessionPending"))) && (
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

  const displayedRolls = rolls;

  const validateIqcFields = (): boolean => {
    if (!inspectorId) {
      message.warning("請輸入品檢人員員工工號");
      return false;
    }

    if (!incomingStorageCode) {
      message.warning("請選擇入庫儲位");
      return false;
    }

    if (isRollMaterial && !(standardCoreDia != null && standardCoreDia > 0)) {
      message.warning("卷料完成品檢前必須填寫標準內管芯外徑");
      return false;
    }

    // 卷料分組僅依原廠批號檢核；片料以可信群組身分隔離。
    const uniqueKeys = new Set<string>();
    for (let idx = 0; idx < sheetLots.length; idx++) {
      const lot = sheetLots[idx];
      const cleanLotNo = (lot.supplierLotNo || "").trim().toUpperCase();
      const uniqueKey = isRollMaterial ? cleanLotNo : lot.id;
      
      if (uniqueKeys.has(uniqueKey)) {
        const errorMsg = isRollMaterial
          ? `【第一步防呆】存在重複的原廠批號「${cleanLotNo || "空白"}」！每個卷料分組必須使用唯一批號。`
          : "分組識別碼缺失或重複，請重新載入並確認分組。";
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

      const appearanceVal = currentAppearanceFor(r);
      if (appearanceVal !== "Pass" && appearanceVal !== "NG") {
        message.warning(`請選擇 ${nameLabel} 的「表面外觀」`);
        return false;
      }
      {
        // 每個抽樣實測數據都不可為空且必須大於 0

        // 1. 實測厚度 (Roll / Sheet 皆有)
        if (
          r.measuredSampleThicknessMm === null ||
          r.measuredSampleThicknessMm === undefined ||
          r.measuredSampleThicknessMm === ""
        ) {
          message.warning(`請輸入 ${nameLabel} 的「實測厚度」`);
          return false;
        }
        if (positiveMeasurement(r.measuredSampleThicknessMm) == null || positiveMeasurement(r.inspectionItems?.find((itm: any) => itm.itemCode === "thickness")?.measuredValue) == null) {
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
        if (positiveMeasurement(widthVal) == null) {
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
          if (positiveMeasurement(r.actualQtyAux) == null) {
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
          if (positiveMeasurement(r.measuredCoreDiaMm) == null) {
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
          if (positiveMeasurement(r.measuredOuterDiaMm) == null) {
            message.warning(`${nameLabel} 的「實測外徑」必須大於 0`);
            return false;
          }
          if (Number(r.measuredOuterDiaMm) <= Number(r.measuredCoreDiaMm)) {
            message.warning("實測外徑必須大於內管芯外徑");
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
          if (positiveMeasurement(lengthVal) == null) {
            message.warning(`${nameLabel} 的「實測長度」必須大於 0`);
            return false;
          }
        }
      }

      // 檢核仍需輸入的實測細項；判定統一由樣品層級處理。
      for (let j = 0; j < r.inspectionItems.length; j++) {
        const item = r.inspectionItems[j];
        if (item.itemCode === "appearance_desc") continue;

        const measuredVal = item.itemCode === "appearance" ? appearanceVal : item.measuredValue;
        if (measuredVal == null || String(measuredVal).trim() === "") {
          message.warning(
            `請填寫 ${nameLabel} 檢驗項目【${item.itemName || item.itemCode}】的「實測值」`,
          );
          return false;
        }
        if (["thickness", "width", "length", "core_dia"].includes(item.itemCode) && positiveMeasurement(measuredVal) == null) {
          message.warning(`${nameLabel} 的「${item.itemName || item.itemCode}」必須為有效數字且大於 0`);
          return false;
        }
      }
      if (r.isOk !== true && r.isOk !== false) {
        message.warning(`請為 ${nameLabel} 樣品選擇合格或異常判定`);
        return false;
      }
      if (r.isOk === false && !String(r.defectReason || "").trim()) {
        message.warning(`請輸入 ${nameLabel} 的「異常原因」`);
        return false;
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

  const handleEscalate = () => {
    if (guardDisposition("escalate")) return;
    escalateMutation.mutate(undefined, {
      onSuccess: () => setIsDecisionModalOpen(false),
    });
  };

  const handleSubmit = () => {
    const action = overallResult === "Concession" ? "concession" : "complete";
    if (guardDisposition(action)) return;
    if (!validateRevisionAndReasons()) return;
    if (!resolveSampleGroups(rolls, sheetLots)) return;
    if (!validateIqcFields()) {
      return;
    }

    const tempSheetLots = sheetLots.map(l => ({
          ...l,
          supplierLotNo: (!l.supplierLotNo || l.supplierLotNo.trim() === "") ? "" : l.supplierLotNo.trim().toUpperCase()
        }));

    if (detail.inspectionType === "Production") {
      const good = productionGoodQuantity === null ? null : parseProductionQuantity(productionGoodQuantity, detail.productionQuantityUnit), defect = productionDefectQuantity === null ? null : parseProductionQuantity(productionDefectQuantity, detail.productionQuantityUnit), total = detail.productionTotalQuantity;
      if (good == null || defect == null || total == null || !Number.isFinite(good) || !Number.isFinite(defect) || good < 0 || defect < 0 || (detail.productionQuantityUnit === "PCS" && (!Number.isInteger(good) || !Number.isInteger(defect))) || Math.abs(good + defect - total) > 1e-9 || (overallResult === "AllPass" && (good !== total || defect !== 0)) || (overallResult === "Reject" && (good !== 0 || defect !== total)) || (overallResult === "Partial" && (good <= 0 || defect <= 0)) || overallResult === "Concession") {
        message.warning("請確認良品及不良數量與來源總量及判定結果一致。");
        return;
      }
    }
    const hasNg = displayedRolls.some((r) => r.isOk === false);
    if (hasNg && overallResult === "AllPass") {
      message.warning(
        "明細中存有不合格項目，依「任一不良即整批退貨」規定，判定結果不可為 AllPass (全部通過)！請選擇全部退回 (Reject) 或申請特採 (Concession)。",
      );
      return;
    }

    if (!hasNg && overallResult === "Concession") {
      message.warning(
        "明細中無不合格項目，不可申請特採！請選擇 AllPass (全部通過)。",
      );
      return;
    }

    // 💡 片材與捲材資料平衡處理
    const balancedRolls = isRollMaterial
      ? displayedRolls.map(r => ({
          ...r,
          supplierLotNo: (r.supplierLotNo || "").trim().toUpperCase() // 使用品檢員在行內輸入的原廠批號
        }))
      : allocateSheetGroupQuantities(displayedRolls, tempSheetLots);

    const executeSubmit = (finalRolls: any[], finalLots: any[]) => {
      if (guardDisposition(action)) return;
      const resolved = resolveSampleGroups(finalRolls, finalLots);
      if (!resolved) return;
      const groupsPayload = finalLots.map((lot, idx) => {
        const cleanLotNo = (lot.supplierLotNo || "").trim().toUpperCase();
        const lotRolls = resolved.filter((r: any) => r._groupId === lot.id);

        return {
          groupSeq: idx + 1,
          supplierLotNo: cleanLotNo,
          allocatedQty: Number(lot.qty) || 0,
          sampleQty: Number(lot.sampleQty) || 0,
          samples: lotRolls.map((r: any, rIdx: number) => serializeSample(r, {
            seq: rIdx + 1,
            sampleNo: r.sampleNo || String(rIdx + 1).padStart(2, "0"),
            rollNo: r.rollNo || `S-${String(rIdx + 1).padStart(2, "0")}`,
            supplierLotNo: cleanLotNo,
          }))
        };
      });

      // 組裝過帳 Payloads
      const payload = {
        expectedRevision: detail.revision,
        overallResult,
        inspectorId: inspectorId.toUpperCase(),
        responsibleParty:
          overallResult !== "AllPass"
            ? responsibleParty || detail?.supplierCode
            : undefined,
        notes,
        incomingStorageCode: incomingStorageCode || undefined,
        sampleSize: sampleCount, // 💡 同步將計算出的抽樣數回寫至資料庫
        standardCoreDiaMm: isRollMaterial ? (standardCoreDia ?? null) : null,
        measuredCoreDiaMm: null,
        ...(detail.inspectionType === "Production" ? { productionGoodQuantity: productionGoodQuantity === null ? null : parseProductionQuantity(productionGoodQuantity, detail.productionQuantityUnit), productionDefectQuantity: productionDefectQuantity === null ? null : parseProductionQuantity(productionDefectQuantity, detail.productionQuantityUnit) } : { standardLength: standardLength || undefined }),
        rolls: finalRolls.map((r) => serializeSample(r)),
        groups: groupsPayload, // 💡 補上品質過帳分群列表
      };

      completeMutation.mutate(payload);
    };

    // 剛性檢核：若為特採 Concession，但未達 100% 全檢，彈出二次確認，不硬性封死
    if (
      isRollMaterial &&
      overallResult === "Concession" &&
      displayedRolls.length < detail?.rollCount
    ) {
      modal.confirm({
        title: "品質特採安全提示",
        content: "依標準流程，若有不良品欲申請特採，建議先對剩下未檢驗的卷料執行 100% 全檢。是否確認直接以目前的抽樣量提交特採會簽申請？",
        okText: "確認直接提交特採",
        cancelText: "取消並返回全檢",
        onOk: () => {
          executeSubmit(balancedRolls, tempSheetLots);
        }
      });
      return;
    }

    // 常規提交
    executeSubmit(balancedRolls, tempSheetLots);
  };

  // 5. 數據與看板計算
  const inspectedRolls = displayedRolls;

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
              onFocus={(e) => {
                e.target.select();
                {
                  editingLotRolls.current = {
                    id: record.id,
                    rollNos: new Set(rolls.filter(r => r._groupId === record.id).map(r => r.rollNo)),
                  };
                }
              }}
              onChange={(e) => {
                const cleanVal = e.target.value.replace(/[\u4e00-\u9fa5]/g, "").toUpperCase();
                setSheetLots(prev => prev.map(l => l.id === record.id ? { ...l, supplierLotNo: cleanVal } : l));
                const members = editingLotRolls.current;
                if (members?.id === record.id) {
                  setRolls(prev => prev.map(r => members.rollNos.has(r.rollNo) ? updateSampleGroupLot(r, cleanVal) : r));
                }
              }}
              onBlur={(e) => {
                const cleanVal = e.target.value.trim().toUpperCase();
                setSheetLots(prev => prev.map(l => l.id === record.id ? { ...l, supplierLotNo: cleanVal } : l));
                const members = editingLotRolls.current;
                if (members?.id === record.id) {
                  setRolls(prev => prev.map(r => members.rollNos.has(r.rollNo) ? updateSampleGroupLot(r, cleanVal) : r));
                }
                editingLotRolls.current = null;
              }}
            />
          );
        }
      },
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
              aria-label={`抽樣數 ${record.supplierLotNo || "未填批號"}`}
              value={numVal}
              size="small"
              min={0}
              className="w-full text-xs font-mono"
              onFocus={(e) => e.target.select()}
              onChange={(num) => {
                const newSampleQty = num || 0;
                if (newSampleQty > numVal) {
                  createRollSamples(record.id, newSampleQty - numVal);
                } else if (newSampleQty < numVal) {
                  const members = rolls.filter(r => r._groupId === record.id && !r._groupAmbiguous);
                  if (members.length !== numVal || rolls.some(r => r._groupAmbiguous || !r._groupId)) {
                    message.warning("無法安全選擇要移除的尾端樣品，請確認樣品分組身分。");
                    return;
                  }
                  const removed = new Set(members.slice(newSampleQty));
                  setRolls(prev => prev.filter(r => !removed.has(r)));
                }
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
              const members = rolls.filter(r => r._groupId === record.id && !r._groupAmbiguous);
              if (rolls.some(r => r._groupAmbiguous || !r._groupId) || members.length !== (record.sampleQty ?? 0)) {
                message.warning("無法安全移除分組不明的樣品，請先確認樣品資料。");
                return;
              }
              if (sheetLots.length <= 1) {
                message.warning("至少必須保留一組原廠批號！");
                return;
              }
              modal.confirm({
                title: "確定要刪除此原廠批號嗎？",
                content: "此操作會移除本組尚未填寫的新樣品。",
                onOk: () => {
                  setRolls(prev => prev.filter(r => !members.includes(r)));
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
  }, [isRollMaterial, isReadOnly, sheetLots, rolls, message, modal]);

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
        value: "NG",
        label: (
          <Space size={8}>
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#ff4d4f] shadow" />
            <span>異常</span>
          </Space>
        )
      }
    ];

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
                  isAutoApproved || record.isOk == null ? "default" : record.isOk ? "success" : "error"
                }
              />
              <Text
                strong={record.isOk === false}
                className={
                  record.isOk === false ? "text-red-500 font-bold" : "text-slate-700"
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
          const rawValue = record.appearance ?? rollItem?.measuredValue ?? null;
          const currentVal = normalizeAppearance(rawValue);

          if (isReadOnly) {
            const option = appearanceOptions.find(o => o.value === currentVal);
            return (
              <span className="font-semibold text-xs text-[var(--ant-color-text)]">
                {option ? option.label : String(rawValue || "未填寫")}
              </span>
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
          const options = sheetLots.map(l => ({
            label: `${l.supplierLotNo || "（空白）"}`,
            value: l.id,
          }));
          const currentLot = sheetLots.find(l => l.id === record._groupId);
          const canAssignLot = !record.sampleId && (canRemoveBlankSamples([record]) || record._groupAmbiguous || !record._groupId);

          return (
            <Select
              size="small"
              showSearch
              optionFilterProp="label"
              disabled={!canAssignLot}
              value={currentLot?.id}
              placeholder="選擇分配原廠批"
              onChange={(selectedId) => {
                if (!canAssignLot) return;
                const targetLot = sheetLots.find(l => l.id === selectedId);
                if (!targetLot) return;

                if (record._groupId && !record._groupAmbiguous && record._groupId !== targetLot.id) {
                  setSheetLots(prev => prev.map(l => l.id === record._groupId
                    ? { ...l, sampleQty: l.sampleQty - 1 }
                    : l.id === targetLot.id ? { ...l, sampleQty: l.sampleQty + 1 } : l));
                } else if (!record._groupId || record._groupAmbiguous) {
                  const currentInTarget = rolls.filter(r => r._groupId === targetLot.id && !r._groupAmbiguous).length;
                  if (currentInTarget >= targetLot.sampleQty) {
                    setSheetLots(prev => prev.map(l => l.id === targetLot.id ? { ...l, sampleQty: l.sampleQty + 1 } : l));
                  }
                }
                setRolls((prevRolls) => prevRolls.map((r) => {
                  if (r.rollNo !== record.rollNo) return r;
                  const { _blankSnapshot, ...sample } = r;
                  const nextSample = { ...sample, _groupId: targetLot.id, _groupAmbiguous: false, supplierLotNo: targetLot.supplierLotNo };
                  return canRemoveBlankSamples([r]) ? markNewBlankSample(nextSample) : nextSample;
                }));
              }}
              options={options}
              className="w-full font-mono text-blue-600"
            />
          );
        }
      },
      // 3. 實測厚度
      {
        title: `實測厚度(mm) (${detail?.standardThickness != null && Number.isFinite(detail.standardThickness) && detail.standardThickness > 0 ? `${detail.standardThickness}±0.002` : "未設定"})`,
        key: "thickness",
        width: 130,
        align: "left" as const,
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
        title: `實測寬度(mm) (${detail?.standardWidth != null && Number.isFinite(detail.standardWidth) && detail.standardWidth > 0 ? `${detail.standardWidth}±0.5` : "未設定"})`,
        key: "width",
        width: 130,
        align: "left" as const,
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
        align: "left" as const,
        render: (val: number, record: any) => (
          <InputNumber
            size="small"
            value={val !== undefined && val !== null ? val : undefined} // 💡 UX 拋光：允許為空，使使用者在倒退 (Backspace) 清除時，輸入框能保持空白，絕不突兀塞入預設值
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
                    // 💡 UX 拋光：當 num 為 null 時，直接設定為 null，允許使用者清除後重新輸入
                    const updated = { ...r, measuredOuterDiaMm: num };
                    return recalculateRollLengthForRoll(updated, detail?.standardThickness);
                  }
                  return r;
                })
              );
            }}
            className="font-mono text-left pl-2 w-full"
          />
        )
      });

      // 6. 實測長度
      baseCols.push({
        title: `實測長度(M) (${standardLength != null && Number.isFinite(standardLength) && standardLength > 0 ? `${standardLength}±5` : "未設定"})`,
        key: "length",
        width: 140,
        align: "left" as const,
        render: (_: any, record: any) => {
          const Do = record.measuredOuterDiaMm;
          const Di = Number(record.measuredCoreDiaMm ?? record.inspectionItems?.find((i: any) => i.itemCode === "core_dia")?.measuredValue);
          const t = positiveMeasurement(detail?.standardThickness);

          const calculatedMeters = calculateRollLength(Do, Di, t);
          const stdLength = standardLength != null && Number.isFinite(standardLength) && standardLength > 0 ? standardLength : null;
          const deviation = calculatedMeters > 0 && stdLength != null
            ? Math.round(((calculatedMeters - stdLength) / stdLength) * 1000) / 10
            : null;

          return (
            <div className="font-mono text-left pl-2 font-bold text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded border border-blue-200/50 dark:border-blue-800/50">
              <span>{calculatedMeters > 0 ? `${calculatedMeters} M` : "無法計算"}</span>
              {deviation != null && (
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
        title: `內管芯外徑(mm) (${standardCoreDia != null && standardCoreDia > 0 ? `${standardCoreDia}` : "未設定"})`,
        key: "core_dia",
        width: 130,
        align: "left" as const,
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
        title: `實測長度(mm) (${standardLength != null && Number.isFinite(standardLength) && standardLength > 0 ? `${standardLength}±5` : "未設定"})`,
        key: "length",
        width: 130,
        align: "left" as const,
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

    // 每個樣品只保留統一檢驗判定。

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
          {record.isOk == null && <span>未判定</span>}
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

    baseCols.push({
      title: "異常原因",
      key: "defectReason",
      width: 220,
      render: (_: any, record: any) => {
        if (isReadOnly) {
          return record.isOk === false ? (record.defectReason || "未提供") : "-";
        }
        return (
          <Input
            aria-label={isRollMaterial ? `${record.rollNo}異常原因` : `第 ${record.seq} 筆異常原因`}
            placeholder="請輸入異常原因"
            value={record.defectReason ?? ""}
            disabled={record.isOk !== false}
            onChange={(event) => {
              const value = event.target.value;
              setRolls(prev => prev.map(r => r.rollNo === record.rollNo ? { ...r, defectReason: value } : r));
            }}
          />
        );
      },
    });

    if (isCompletedAndPosted) {
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
    isCompletedAndPosted,
    handleMeasuredItemValueChange,
    handleStatusChange,
    detail,
    handlePrintSingleLabelPdf,
    isRollMaterial,
    sheetLots,
    standardCoreDia,
    calculateRollLength,
    recalculateRollLengthForRoll
  ]);

  const totalLength = useMemo(() => {
    if (!detail) return 0;
    if (isRollMaterial && detail.inspectionType === "Production") return null;
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
    standardCoreDia,
    setStandardCoreDia,
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
    standardThickness: detail?.standardThickness ?? null,
    standardWidth: detail?.standardWidth,
    standardLength: detail?.standardLength,
    poLineNumber: detail?.poLineNumber,
    incomingStorageCode: incomingStorageCode,
    standardCoreDiaMm: isRollMaterial ? standardCoreDia : null,
    measuredCoreDiaMm: null,
  }), [detail, inspectorId, incomingStorageCode, standardCoreDia, isRollMaterial, headerSupplierLot]);

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
        {isProductionDispositionPaused() && <Alert type="warning" showIcon title="Production 過帳目前暫停" description="後端尚未開放生產檢驗過帳；草稿欄位是否保存須重新讀回確認。" />}
        {detail?.inspectionType === "Production" && <Card title="製令檢驗規格快照" size="small">
          {detail.semiFinishedInspectionSpec ? <Table bordered size="small" pagination={false} scroll={{ x: "max-content" }} rowKey="itemCode" dataSource={detail.semiFinishedInspectionSpec.items} columns={[
            { title: "檢驗項目", dataIndex: "itemName" },
            { title: "規格", dataIndex: "specification" },
            { title: "標準值", dataIndex: "standardValue", render: (v: number | null) => v ?? "未設定" },
            { title: "容差", dataIndex: "tolerance", render: (v: number | null) => v ?? "未設定" },
            { title: "單位", dataIndex: "unit", render: (v: string | null) => v ?? "—" },
          ]} /> : <Text type="secondary">未提供製令檢驗規格快照</Text>}
        </Card>}
        {detail?.inspectionType === "Production" && <Card title="生產整批數量" size="small">
          <Space wrap>
            <span>來源總量：{detail.productionTotalQuantity ?? "未提供"} {detail.productionQuantityUnit ?? ""}</span>
            <label>良品數量 <InputNumber stringMode aria-label="良品數量" value={productionGoodQuantity} disabled={isReadOnly} onChange={setProductionGoodQuantity} /></label>
            <label>不良數量 <InputNumber stringMode aria-label="不良數量" value={productionDefectQuantity} disabled={isReadOnly} onChange={setProductionDefectQuantity} /></label>
          </Space>
        </Card>}
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
                  onValuesChange={(values: any) => {
                    if (detail.inspectionType !== "Production" && values.standardLength !== undefined && values.standardLength !== standardLength) {
                      setStandardLength(values.standardLength);
                    }
                  }}
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
                            const groupId = `lot-${crypto.randomUUID()}`;
                            createRollSamples(groupId, 1);
                            setSheetLots(prev => {
                              const nextLots = [
                                ...prev,
                                { 
                                  id: groupId,
                                  supplierLotNo: "", 
                                  qty: remaining,
                                  sampleQty: 1
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
                    title={
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
                    record.isOk === false
                      ? "bg-red-500/10 dark:bg-red-950/20 text-red-500"
                      : ""
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
                  detail?.inspectionStatus === "Pending" &&
                  isRollMaterial
                    ? "確認並啟動 100% 全檢"
                    : overallResult === "Concession"
                      ? "確認並提交特採申請"
                      : "確認過帳"
                }
                cancelText="取消"
                okButtonProps={{ disabled: !!getDispositionBlockReason(
                  overallResult === "Concession"
                    ? detail?.inspectionStatus === "Pending" && isRollMaterial ? "escalate" : "concession"
                    : "complete"
                ) }}
                onOk={
                  overallResult === "Concession" &&
                  detail?.inspectionStatus === "Pending" &&
                  isRollMaterial
                    ? handleEscalate
                    : handleSubmit
                }
                confirmLoading={
                  overallResult === "Concession" &&
                  detail?.inspectionStatus === "Pending" &&
                  isRollMaterial
                    ? escalateMutation.isPending
                    : completeMutation.isPending
                }
                footer={
                  overallResult === "Concession" && detail?.inspectionStatus === "Pending" && isRollMaterial ? (
                    <div className="flex justify-end gap-2">
                      <Button onClick={() => setIsDecisionModalOpen(false)}>
                        取消
                      </Button>
                      <Button
                        type="dashed"
                        className="border-amber-500 text-amber-600 hover:bg-amber-50/10 font-bold"
                        loading={escalateMutation.isPending}
                        disabled={!!getDispositionBlockReason("escalate")}
                        onClick={handleEscalate}
                      >
                        啟動 100% 全檢
                      </Button>
                      <Button
                        type="primary"
                        className="bg-blue-600 hover:bg-blue-500 text-white border-none font-bold"
                        loading={completeMutation.isPending}
                        disabled={!!getDispositionBlockReason("concession")}
                        onClick={handleSubmit}
                      >
                        直接提交特採申請
                      </Button>
                    </div>
                  ) : undefined
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

                      {detail.inspectionType === "Production" && <Radio.Button value="Partial">Partial (部分合格，部分報廢)</Radio.Button>}
                      {detail.inspectionType !== "Production" && !detail.sourceDocNumber?.startsWith("CR") && <Radio.Button
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
                      </Radio.Button>}

                      <Radio.Button
                        value="Reject"
                        className="w-full py-2 h-auto flex flex-col items-center"
                      >
                        <CloseCircleOutlined className="text-red-500 text-lg mb-1" />
                        <Text strong className="text-red-700">
                          {detail.inspectionType === "Production" ? "Reject (全部報廢)" : "Reject (全部退回)"}
                        </Text>
                        <Text type="secondary" className="text-xs">
                          {detail.inspectionType === "Production" ? "整批報廢，不建立可用庫存。" : "整批拒收退回，全數不建卡入庫，採購量全額扣回。"}
                        </Text>
                      </Radio.Button>
                    </Radio.Group>
                  </div>

                  {/* 當有 NG 卷判定退貨時，彈出剛性對帳與扣款警告 */}
                  {detail.inspectionType !== "Production" && ngCount > 0 && overallResult === "Reject" && (
                    <Alert
                      type="warning"
                      showIcon
                      icon={
                        <WarningOutlined className="text-amber-600 text-lg" />
                      }
                      title={
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
                      title={
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
                    title="目前此單處於【特採會簽審核中】"
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
