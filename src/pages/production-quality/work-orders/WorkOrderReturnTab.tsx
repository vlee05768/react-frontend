import { useState, useEffect, useRef, useMemo } from "react";
import {
  Card,
  Table,
  Tag,
  Space,
  Button,
  Empty,
  App,
  Spin,
  InputNumber,
  Input,
  Select,
  Tooltip,
} from "antd";
import {
  SaveOutlined,
  EditOutlined,
  DeleteOutlined,
  SyncOutlined,
  BarcodeOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getApiV1WorkOrderReturnWoByWorkOrderNumber,
  getApiV1WorkOrderReturnByDocumentNumber,
  postApiV1WorkOrderReturn,
  putApiV1WorkOrderReturnByDocumentNumber,
  postApiV1WorkOrderReturnByDocumentNumberCancel,
  deleteApiV1WorkOrderReturnByDocumentNumber,
  getApiV1WorkOrderReturnWipRolls,
  getApiV1Storage,
} from "@/api/generated/sdk.gen";
import { getApiErrorMessage } from "@/utils/apiError";
import dayjs from "dayjs";
import type { WorkOrderDto } from "@/api/generated/types.gen";
import { DynamicForm } from "@/components/Form/DynamicForm";
import { returnHeaderFormConfig } from "./WorkOrderConfig";

interface WorkOrderReturnTabProps {
  masterData: WorkOrderDto;
  onEditingChange?: (editing: boolean) => void;
}

// 扁平化 LPN 卷卡介面定義
interface FlatReturnRoll {
  materialCode: string;
  materialName: string;
  rollNo: string;
  widthMm: number;
  thicknessMm: number;
  coreDiaMm: number;
  originalQtyAux: number;
  wipQtyAux: number; // 領用長度 (WIP)
  qtyAux: number; // 退回長度 (預設為 0)
  measuredDiaMm: number | null; // 實測外徑
  storageCode: string; // 目的儲位
  costPerSqm: number;
  remainingMaterialCost: number; // 餘料成本 (整數)
  notes?: string;
}

export function WorkOrderReturnTab({ masterData, onEditingChange }: WorkOrderReturnTabProps) {
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();

  const [isCreating, setIsCreating] = useState(false);
  const [isHeaderEditing, setIsHeaderEditing] = useState(false);

  // 退料主檔表頭編輯狀態
  const [docDate, setDocDate] = useState<dayjs.Dayjs>(dayjs());
  const [docNotes, setDocNotes] = useState("");

  // 核心扁平化明細管理
  const [flatRolls, setFlatRolls] = useState<FlatReturnRoll[]>([]);

  // 條碼槍快速掃描狀態
  const [scanRollNo, setScanRollNo] = useState("");
  const [lpnError, setLpnError] = useState("");
  const scanInputRef = useRef<any>(null);

  // 1. 取得該製令的退料單列表 (1對1，拿第一筆)
  const {
    data: returnsResponse,
    isLoading: listLoading,
    refetch: refetchList,
  } = useQuery({
    queryKey: ["returns", masterData.workOrderNumber],
    queryFn: () =>
      getApiV1WorkOrderReturnWoByWorkOrderNumber({
        path: { workOrderNumber: masterData.workOrderNumber! },
      }),
    enabled: !!masterData.workOrderNumber,
  });

  const returnList = (returnsResponse?.data as any)?.data || [];
  const activeDocNo =
    returnList.length > 0 ? returnList[0].documentNumber : null;

  // 2. 取得所有物料儲位選項
  const { data: storageResponse } = useQuery({
    queryKey: ["raw-storages-direct", masterData.workOrderNumber],
    queryFn: () => getApiV1Storage({ query: { Type: "MAT" } }),
  });

  const storageOptions = useMemo(() => {
    const rawList = (storageResponse?.data as any)?.data?.data || (storageResponse?.data as any)?.data || [];
    const list = Array.isArray(rawList) ? rawList : [];
    return list.map((x: any) => ({
      label: `${x.name} (${x.code})`,
      value: x.code,
    }));
  }, [storageResponse]);

  const defaultStorageCode = useMemo(() => {
    return storageOptions[0]?.value || "";
  }, [storageOptions]);

  // 3. 取得退料單詳情
  const {
    data: detailResponse,
    isLoading: detailLoading,
    refetch: refetchDetail,
  } = useQuery({
    queryKey: ["return", activeDocNo],
    queryFn: () =>
      getApiV1WorkOrderReturnByDocumentNumber({
        path: { documentNumber: activeDocNo! },
      }),
    enabled: !!activeDocNo,
  });

  const activeRecord = (detailResponse?.data as any)?.data || undefined;
  const isPosted = activeRecord && !!activeRecord.confirmDate;
  const isEditable = isCreating || isHeaderEditing;

  // 4. 取得此製令在現場的所有 WIP 卷卡
  const { data: wipRollsRes } = useQuery({
    queryKey: ["wipRollsAll", masterData.workOrderNumber],
    queryFn: () => getApiV1WorkOrderReturnWipRolls({
      query: { workOrderNumber: masterData.workOrderNumber!, materialCode: "" }
    }),
    enabled: !!masterData.workOrderNumber,
  });

  const allWipRolls = (wipRollsRes?.data as any)?.data || [];

  // 計算動態總餘料成本
  const calculatedTotalCost = useMemo(() => {
    return flatRolls.reduce((sum, r) => sum + r.remainingMaterialCost, 0);
  }, [flatRolls]);

  // 💡 物理公式反算：L = π * (Do^2 - Di^2) / (4000 * t)
  const calculateQtyFromDia = (dia: number, roll: any) => {
    const Do = dia; // 實測外徑
    const Di = Number(roll.coreDiaMm || 86); // 紙芯外徑 (預設86)
    const t = Number(roll.thicknessMm || 0.05); // 厚度 (mm)
    const maxWipQty = Number(roll.wipQtyAux); // 現場上限長度

    if (Do < Di) {
      return 0;
    }

    const calculatedLength = (Math.PI * (Do * Do - Di * Di)) / (4000 * t);
    return Math.max(0, Math.min(maxWipQty, parseFloat(calculatedLength.toFixed(2))));
  };

  // 當 activeRecord (草稿載入) 變更時，初始化狀態與扁平化明細
  useEffect(() => {
    if (activeRecord && !isCreating) {
      setDocDate(dayjs(activeRecord.documentDate));
      setDocNotes(activeRecord.notes || "");
      setIsHeaderEditing(false);

      const loadedRolls: FlatReturnRoll[] = [];
      (activeRecord.items || []).forEach((item: any) => {
        if (item.extraDataJson) {
          try {
            const extra = JSON.parse(item.extraDataJson);
            if (Array.isArray(extra)) {
              extra.forEach((r: any) => {
                const qty = r.qtyAux ?? r.QtyAux ?? 0;
                const width = r.widthMm ?? r.WidthMm ?? 0;
                const costSqm = r.costPerSqm ?? r.CostPerSqm ?? 0;
                loadedRolls.push({
                  materialCode: r.materialCode ?? r.MaterialCode ?? item.materialCode,
                  materialName: item.materialName || "",
                  rollNo: r.rollNo ?? r.RollNo,
                  widthMm: width,
                  thicknessMm: r.thicknessMm ?? r.ThicknessMm ?? 0.05,
                  coreDiaMm: r.coreDiaMm ?? r.CoreDiaMm ?? 86,
                  originalQtyAux: r.originalQtyAux ?? r.OriginalQtyAux ?? qty,
                  wipQtyAux: r.wipQtyAux ?? r.WipQtyAux ?? qty,
                  qtyAux: qty,
                  measuredDiaMm: r.measuredDiaMm ?? r.MeasuredDiaMm ?? null,
                  storageCode: r.storageCode ?? r.StorageCode ?? item.targetStorageCode ?? defaultStorageCode,
                  costPerSqm: costSqm,
                  remainingMaterialCost: Math.round(qty * (width / 1000) * costSqm),
                  notes: r.notes ?? "",
                });
              });
            }
          } catch (e) {
            console.error("解析 LPN 詳情 JSON 失敗：", e);
          }
        }
      });
      setFlatRolls(loadedRolls);
    }
  }, [activeRecord, isCreating, defaultStorageCode]);

  // 監聽編輯狀態
  useEffect(() => {
    onEditingChange?.(isCreating || isHeaderEditing);
  }, [isCreating, isHeaderEditing, onEditingChange]);

  // 💡 自動 Focus 條碼槍掃描框
  useEffect(() => {
    if (isEditable && scanInputRef.current) {
      setTimeout(() => {
        scanInputRef.current?.focus();
      }, 300);
    }
  }, [isEditable]);

  // 5. Mutations 定義
  const createMutation = useMutation({
    mutationFn: (values: any) => postApiV1WorkOrderReturn({ body: values }),
    onSuccess: () => {
      message.success("退料單建立成功！");
      queryClient.invalidateQueries({ queryKey: ["returns", masterData.workOrderNumber] });
      queryClient.invalidateQueries({ queryKey: ["wipRollsAll", masterData.workOrderNumber] });
      setIsCreating(false);
      setIsHeaderEditing(false);
      refetchList();
    },
    onError: (error) => {
      modal.error({
        title: "建立失敗",
        content: getApiErrorMessage(error),
        centered: true,
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (values: any) =>
      putApiV1WorkOrderReturnByDocumentNumber({
        path: { documentNumber: activeDocNo! },
        body: values,
      }),
    onSuccess: () => {
      message.success("儲存修改成功！");
      queryClient.invalidateQueries({ queryKey: ["return", activeDocNo] });
      queryClient.invalidateQueries({ queryKey: ["returns", masterData.workOrderNumber] });
      queryClient.invalidateQueries({ queryKey: ["wipRollsAll", masterData.workOrderNumber] });
      setIsHeaderEditing(false);
      refetchDetail();
      refetchList();
    },
    onError: (error) => {
      modal.error({
        title: "儲存失敗",
        content: getApiErrorMessage(error),
        centered: true,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () =>
      deleteApiV1WorkOrderReturnByDocumentNumber({
        path: { documentNumber: activeDocNo! },
      }),
    onSuccess: () => {
      message.success("退料單刪除成功");
      queryClient.invalidateQueries({ queryKey: ["returns", masterData.workOrderNumber] });
      queryClient.invalidateQueries({ queryKey: ["wipRollsAll", masterData.workOrderNumber] });
      queryClient.invalidateQueries({ queryKey: ["workorders"] });
      if (masterData?.workOrderNumber) {
        queryClient.invalidateQueries({ queryKey: ["workorder", masterData.workOrderNumber] });
      }
      setIsCreating(false);
      setFlatRolls([]);
      refetchList();
    },
    onError: (error) => {
      modal.error({
        title: "刪除失敗",
        content: getApiErrorMessage(error),
        centered: true,
      });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () =>
      postApiV1WorkOrderReturnByDocumentNumberCancel({
        path: { documentNumber: activeDocNo! },
      }),
    onSuccess: () => {
      message.success("取消退料過帳成功！LPN 已恢復為車間 WIP 狀態");
      queryClient.invalidateQueries({ queryKey: ["return", activeDocNo] });
      queryClient.invalidateQueries({ queryKey: ["returns", masterData.workOrderNumber] });
      queryClient.invalidateQueries({ queryKey: ["wipRollsAll", masterData.workOrderNumber] });
      queryClient.invalidateQueries({ queryKey: ["workorders"] });
      if (masterData?.workOrderNumber) {
        queryClient.invalidateQueries({ queryKey: ["workorder", masterData.workOrderNumber] });
      }
      refetchDetail();
      refetchList();
    },
    onError: (error) => {
      modal.error({
        title: "取消失敗",
        content: getApiErrorMessage(error),
        centered: true,
      });
    },
  });

  // 6. UI 事件與操作處理
  const handleCreateNewClick = () => {
    setIsCreating(true);
    setDocDate(dayjs());
    setDocNotes("");

    // 💡 領料載入明細：自動預載該製令的所有 WIP 卷卡，且「預設剩餘長度 = 0 (耗盡狀態)」
    if (allWipRolls.length === 0) {
      message.warning("此製令目前車間（WIP）無任何可退回物料卷卡。");
    }

    const preloaded = allWipRolls.map((r: any) => ({
      materialCode: r.materialCode,
      materialName: r.materialName || r.name || "",
      rollNo: r.rollNo,
      widthMm: r.widthMm,
      thicknessMm: r.thicknessMm || 0.1,
      coreDiaMm: r.coreDiaMm || 86.0,
      originalQtyAux: r.originalQtyAux,
      wipQtyAux: r.qtyAux, // wip當前最大長度
      qtyAux: 0, // 預設 0M (耗盡)
      measuredDiaMm: null,
      storageCode: r.storageCode || defaultStorageCode,
      costPerSqm: r.costPerSqm || 0,
      remainingMaterialCost: 0,
      notes: "",
    }));

    setFlatRolls(preloaded);
  };

  const handleSave = (formValues: any) => {
    if (flatRolls.length === 0) {
      message.warning("請確保有可退回的卷卡資料！");
      return;
    }

    // 將扁平化明細依 MaterialCode 進行分群，打包回後端所需的 Items 結構
    const grouped: { [key: string]: FlatReturnRoll[] } = {};
    flatRolls.forEach((r) => {
      if (!grouped[r.materialCode]) {
        grouped[r.materialCode] = [];
      }
      grouped[r.materialCode].push(r);
    });

    const savedDate = formValues.documentDate ? dayjs(formValues.documentDate) : docDate;
    const savedNotes = formValues.notes || "";

    const itemsPayload = Object.keys(grouped).map((matCode) => {
      const rolls = grouped[matCode];

      return {
        materialCode: matCode,
        targetStorageCode: rolls[0]?.storageCode || defaultStorageCode, // 後端儲存備用
        notes: "",
        extraDataJson: JSON.stringify(rolls.map(r => ({
          materialCode: r.materialCode,
          rollNo: r.rollNo,
          widthMm: r.widthMm,
          qtyAux: r.qtyAux,
          thicknessMm: r.thicknessMm,
          coreDiaMm: r.coreDiaMm,
          originalQtyAux: r.originalQtyAux,
          wipQtyAux: r.wipQtyAux,
          costPerSqm: r.costPerSqm,
          remainingMaterialCost: r.remainingMaterialCost,
          storageCode: r.storageCode,
          measuredDiaMm: r.measuredDiaMm,
        }))),
      };
    });

    const postData = {
      referenceNumber: masterData.workOrderNumber!,
      documentDate: savedDate.format("YYYY-MM-DD"),
      notes: savedNotes || "",
      items: itemsPayload,
    };

    if (isCreating) {
      createMutation.mutate(postData);
    } else {
      updateMutation.mutate(postData);
    }
  };

  // 行內：外徑輸入異動
  const handleDiaChange = (rollNo: string, val: number | null) => {
    setFlatRolls(prev =>
      prev.map(r => {
        if (r.rollNo === rollNo) {
          const qty = val !== null ? calculateQtyFromDia(val, r) : 0;
          return {
            ...r,
            measuredDiaMm: val,
            qtyAux: qty,
            remainingMaterialCost: Math.round(qty * (r.widthMm / 1000) * r.costPerSqm),
          };
        }
        return r;
      })
    );
  };

  // 行內：退回剩長輸入異動
  const handleQtyChange = (rollNo: string, val: number | null) => {
    setFlatRolls(prev =>
      prev.map(r => {
        if (r.rollNo === rollNo) {
          const qty = val !== null ? Math.max(0, Math.min(r.wipQtyAux, val)) : 0;
          return {
            ...r,
            measuredDiaMm: null, // 手動改長度時清除實測外徑
            qtyAux: qty,
            remainingMaterialCost: Math.round(qty * (r.widthMm / 1000) * r.costPerSqm),
          };
        }
        return r;
      })
    );
  };

  // 行內：一鍵「耗盡 (0 M)」
  const handleDeplete = (rollNo: string) => {
    setFlatRolls(prev =>
      prev.map(r => {
        if (r.rollNo === rollNo) {
          return {
            ...r,
            measuredDiaMm: null,
            qtyAux: 0,
            remainingMaterialCost: 0,
          };
        }
        return r;
      })
    );
  };

  // 行內：一鍵「全退」
  const handleFullReturn = (rollNo: string) => {
    setFlatRolls(prev =>
      prev.map(r => {
        if (r.rollNo === rollNo) {
          const qty = r.wipQtyAux;
          return {
            ...r,
            measuredDiaMm: null,
            qtyAux: qty,
            remainingMaterialCost: Math.round(qty * (r.widthMm / 1000) * r.costPerSqm),
          };
        }
        return r;
      })
    );
  };

  // 行內：自訂儲位變更
  const handleRollStorageChange = (rollNo: string, val: string) => {
    setFlatRolls(prev =>
      prev.map(r => (r.rollNo === rollNo ? { ...r, storageCode: val } : r))
    );
  };

  // 條碼槍掃描即時判定與跳轉
  const handleScannerChange = (val: string) => {
    setScanRollNo(val);
    if (!val) return;

    const trimmed = val.trim().toUpperCase();
    const match = flatRolls.find(x => x.rollNo.toUpperCase() === trimmed);

    if (match) {
      setLpnError("");
      message.success(`成功尋標卷號 ${match.rollNo}！游標已自動定位行內編輯。`);
      
      // 💡 智慧定位、閃爍高亮與自動 Select-All
      setTimeout(() => {
        const inputId = `dia-input-${match.rollNo}`;
        const el = document.getElementById(inputId);
        if (el) {
          el.focus();
          if (el instanceof HTMLInputElement) {
            el.select();
          }
          // 橫列高亮視覺回饋
          const rowEl = el.closest("tr");
          if (rowEl) {
            rowEl.classList.add("bg-green-500/10", "transition-all", "duration-500");
            setTimeout(() => {
              rowEl.classList.remove("bg-green-500/10");
            }, 1500);
          }
        }
      }, 100);
    } else {
      const isExistAny = allWipRolls.some((x: any) => x.rollNo.toUpperCase() === trimmed);
      if (isExistAny) {
        setLpnError("此卷卡已清退，無法重複加入。");
      } else {
        setLpnError("卷號不屬於此製令車間領用清單！");
      }
    }
  };

  // 定義扁平化 LPN 明細橫列
  const columns = [
    {
      title: "快捷操作",
      key: "quickActions",
      width: 150,
      fixed: "left" as const,
      render: (_: any, r: FlatReturnRoll) => {
        if (!isEditable || isPosted) return null;
        return (
          <Space size="small">
            <Button
              type="primary"
              danger
              size="small"
              onClick={() => handleDeplete(r.rollNo)}
            >
              耗盡 🔴
            </Button>
            <Button
              type="primary"
              ghost
              size="small"
              onClick={() => handleFullReturn(r.rollNo)}
            >
              全退 🔵
            </Button>
          </Space>
        );
      },
    },
    {
      title: "狀態判定",
      key: "statusTag",
      width: 110,
      fixed: "left" as const,
      align: "right" as const,
      render: (_: any, r: FlatReturnRoll) => {
        const isDepleted = r.qtyAux === 0;
        const text = isDepleted ? "● 已消耗" : "● 剩餘退回";
        const color = isDepleted ? "error" : "success";
        return (
          <Tooltip title={`原領用 ${r.wipQtyAux}M，退回 ${r.qtyAux}M，車間耗用 ${(r.wipQtyAux - r.qtyAux).toFixed(2)}M`} style={{ whiteSpace: "nowrap" }}>
            <span style={{ display: "inline-block", textAlign: "right", width: "100%" }}>
              <Tag color={color} style={{ marginRight: 0, fontWeight: 600 }}>{text}</Tag>
            </span>
          </Tooltip>
        );
      },
    },
    {
      title: "卷卡號 (LPN)",
      dataIndex: "rollNo",
      key: "rollNo",
      width: 170,
      render: (v: string) => <strong className="text-slate-800 dark:text-slate-200">{v}</strong>,
    },
    {
      title: "原物料料號 / 規格名稱",
      key: "material",
      width: 120,
      ellipsis: { showTitle: false },
      
      render: (_: any, r: FlatReturnRoll) => (
        <div className="flex flex-col gap-0">
          <span className="text-xs text-slate-400 font-mono">{r.materialCode}</span>
          <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">{r.materialName}</span>
        </div>
      ),
    },
    {
      title: "幅寬 (mm)",
      dataIndex: "widthMm",
      key: "widthMm",
      width: 95,
      align: "right" as const,
      render: (v: number) => `${v} mm`,
    },
    {
      title: "領用長度 (M)",
      dataIndex: "wipQtyAux",
      key: "wipQtyAux",
      width: 110,
      align: "right" as const,
      render: (v: number) => <span className="text-blue-500 dark:text-blue-400 font-bold">{v} M</span>,
    },
    {
      title: "實測外徑",
      dataIndex: "measuredDiaMm",
      key: "measuredDiaMm",
      width: 130,
      render: (v: number | null, r: FlatReturnRoll) => (
        <InputNumber
          id={`dia-input-${r.rollNo}`}
          size="small"
          placeholder="量測外徑"
          value={v}
          min={0}
          max={999}
          precision={1}
          style={{ width: "100%" }}
          disabled={!isEditable || isPosted}
          onChange={val => handleDiaChange(r.rollNo, val)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              setScanRollNo("");
              scanInputRef.current?.focus();
              message.success("輸入完成，已跳回掃描框");
            }
          }}
        />
      ),
    },
    {
      title: "退回長度 (M)",
      dataIndex: "qtyAux",
      key: "qtyAux",
      width: 130,
      render: (v: number, r: FlatReturnRoll) => (
        <InputNumber
          size="small"
          value={v}
          min={0}
          max={r.wipQtyAux}
          precision={2}
          style={{ width: "100%" }}
          disabled={!isEditable || isPosted}
          onChange={val => handleQtyChange(r.rollNo, val)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              setScanRollNo("");
              scanInputRef.current?.focus();
              message.success("輸入完成，已跳回掃描框");
            }
          }}
        />
      ),
    },
    // {
    //   title: "退回面積",
    //   key: "areaSqm",
    //   width: 110,
    //   align: "right" as const,
    //   render: (_: any, r: FlatReturnRoll) => (
    //     <span className="text-slate-500">
    //       {((r.qtyAux * r.widthMm) / 1000).toFixed(2)} ㎡
    //     </span>
    //   ),
    // },
    {
      title: "餘料成本",
      dataIndex: "remainingMaterialCost",
      key: "remainingMaterialCost",
      width: 100,
      align: "right" as const,
      render: (v: number) => (
        <span className="font-bold text-green-500 dark:text-green-400">
          ${v.toLocaleString()}
        </span>
      ),
    },
    {
      title: "退回目的儲位",
      dataIndex: "storageCode",
      key: "storageCode",
      width: 170,
      render: (v: string, r: FlatReturnRoll) => (
        <Select
          size="small"
          options={storageOptions}
          value={v}
          style={{ width: "100%" }}
          disabled={!isEditable || isPosted}
          onChange={val => handleRollStorageChange(r.rollNo, val)}
        />
      ),
    },
  ];

  const showHeaderForm = isCreating || !!activeDocNo;

  return (
    <div className="flex flex-col gap-4">
      {/* 車間殘留原料警告橫幅 */}
      {(masterData.pendingWipRollsCount ?? 0) > 0 ? (
        <div className="p-3 bg-orange-50 border border-orange-200 rounded dark:bg-orange-950/20 dark:border-orange-900/50 flex justify-between items-center">
          <span className="text-xs text-orange-600 dark:text-orange-400">
            ⚠️ <strong>警告：</strong>本製令雖已生產完工，但車間（WIP 倉）現場目前仍滯留 <strong>{masterData.pendingWipRollsCount}</strong> 卷原料卷卡未辦理退料/消耗核帳！
          </span>
          {!showHeaderForm && (
            <Button type="primary" size="small" ghost onClick={handleCreateNewClick}>
              立即辦理退料
            </Button>
          )}
        </div>
      ) : ((masterData.pendingWipRollsCount ?? 0) === 0 && masterData.warehousingCompleteDate ? (
        <div className="p-3 bg-green-50 border border-green-200 rounded dark:bg-green-950/20 dark:border-green-900/50">
          <span className="text-xs text-green-600 dark:text-green-400">
            🎉 <strong>恭喜：</strong>車間物料已完全清退結案，現場無任何殘留 WIP 卷卡。
          </span>
        </div>
      ) : null)}

      <Spin spinning={listLoading || detailLoading}>
        {!showHeaderForm ? (
          <Empty description="尚未建立退料單" className="mt-10">
            <Button type="primary" onClick={handleCreateNewClick}>
              產生退料單
            </Button>
          </Empty>
        ) : (
          <div className="flex flex-col gap-4">
            {/* 1. 退料單表頭 採用 DynamicForm */}
            <Card
              size="small"
              title={
                <Space>
                  <strong>
                    {isCreating ? "新增退料單" : `📄 退料單 - ${activeDocNo}`}
                  </strong>
                  {activeRecord &&
                    (activeRecord.confirmDate ? (
                      <Tag color="success">🟢 已確認退料</Tag>
                    ) : (
                      <Tag color="default">⚪ 草稿 (Draft)</Tag>
                    ))}
                </Space>
              }
              extra={
                <Space>
                  {isEditable ? (
                    <>
                      <Button
                        type="primary"
                        size="small"
                        icon={<SaveOutlined />}
                        onClick={() =>
                          (
                            document.getElementById(
                              "returnHeaderForm",
                            ) as HTMLFormElement
                          )?.requestSubmit()
                        }
                        loading={createMutation.isPending || updateMutation.isPending}
                      >
                        儲存草稿
                      </Button>
                      <Button
                        size="small"
                        onClick={() => {
                          if (isCreating) {
                            setIsCreating(false);
                            setFlatRolls([]);
                          } else {
                            setIsHeaderEditing(false);
                          }
                        }}
                      >
                        取消
                      </Button>
                    </>
                  ) : (
                    <>
                      {!isPosted && (
                        <>
                          <Button
                            type="primary"
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() => setIsHeaderEditing(true)}
                          >
                            編輯
                          </Button>
                          <Button
                            danger
                            size="small"
                            icon={<DeleteOutlined />}
                            onClick={() => {
                              modal.confirm({
                                title: "刪除確認",
                                content: "確定要刪除這張退料單草稿嗎？此操作不可逆。",
                                centered: true,
                                onOk: () => deleteMutation.mutate(),
                              });
                            }}
                            loading={deleteMutation.isPending}
                          >
                            刪除
                          </Button>
                        </>
                      )}
                      {isPosted && (
                        <Button
                          danger
                          size="small"
                          icon={<SyncOutlined />}
                          onClick={() => {
                            modal.confirm({
                              title: "取消過帳確認",
                              content: "確定要取消此退料單過帳嗎？這會把卷卡重新轉回 WIP 現場狀態。",
                              centered: true,
                              onOk: () => cancelMutation.mutate(),
                            });
                          }}
                          loading={cancelMutation.isPending}
                        >
                          取消退料過帳
                        </Button>
                      )}
                    </>
                  )}
                </Space>
              }
            >
              <DynamicForm
                formId="returnHeaderForm"
                fields={returnHeaderFormConfig() as any}
                defaultValues={{
                  documentDate: docDate as any,
                  notes: docNotes,
                  totalRemainingMaterialCost: calculatedTotalCost,
                }}
                onSubmit={handleSave}
                isViewMode={!isEditable}
                hideDefaultFooter={true}
              />
            </Card>

            {/* 2. 📱 掃描與盲操快速控制台 */}
            {isEditable && (
              <Card
                size="small"
                className="bg-slate-950 text-slate-100 border-slate-800 shadow-inner"
              >
                <div className="flex flex-col md:flex-row items-start md:items-center gap-4 py-1">
                  <div className="text-xs font-bold text-slate-300 whitespace-nowrap flex items-center gap-1.5 uppercase tracking-wider">
                    <BarcodeOutlined className="text-green-400 text-sm" />
                    條碼掃描槍 blind-flow：
                  </div>
                  <div className="flex-1 w-full flex items-center gap-2">
                    <Input
                      id="barcode-scanner"
                      ref={scanInputRef}
                      placeholder="請直接掃描或輸入實物 LPN 卷卡號..."
                      value={scanRollNo}
                      className="bg-slate-900 border-slate-800 text-white placeholder-slate-500 font-mono text-xs h-8"
                      onChange={e => handleScannerChange(e.target.value)}
                      allowClear
                    />
                    {lpnError && (
                      <span className="text-xs text-red-400 whitespace-nowrap animate-pulse font-medium">
                        {lpnError}
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            )}

            {/* 3. 扁平化行內明細表格 */}
            <Card
              size="small"
              title={<strong>📋 車間領用原料還料明細列表 (*卷材 LPN 級別)</strong>}
            >
              <Table
                size="small"
                dataSource={flatRolls}
                columns={columns}
                pagination={false}
                scroll={{ x: "max-content", y: 400 }}
                rowKey="rollNo"
                locale={{
                  emptyText: "本製令領料單目前沒有任何現場 WIP 卷卡。",
                }}
              />
            </Card>
          </div>
        )}
      </Spin>
    </div>
  );
}
