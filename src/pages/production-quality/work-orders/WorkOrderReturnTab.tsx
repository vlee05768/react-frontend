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
  Modal,
  InputNumber,
  Input,
  Select,
  Tooltip,
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  SaveOutlined,
  SyncOutlined,
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
  getApiV1WorkOrderRequisitionWoByWorkOrderNumber,
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

export function WorkOrderReturnTab({ masterData, onEditingChange }: WorkOrderReturnTabProps) {
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();

  const [isCreating, setIsCreating] = useState(false);
  const [isHeaderEditing, setIsHeaderEditing] = useState(false);
  const justCreatedRef = useRef(false);

  // 退料主檔表頭編輯狀態
  const [docDate, setDocDate] = useState<dayjs.Dayjs>(dayjs());
  const [docNotes, setDocNotes] = useState("");

  // 明細項目狀態
  const [items, setItems] = useState<any[]>([]);

  // 彈窗控制狀態
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);

  // 彈窗內的暫存狀態
  const [wipRolls, setWipRolls] = useState<any[]>([]);
  const [wipLoading, setWipLoading] = useState(false);

  // 💡 取得已加入退料明細的 LPN 列表，以便候選清單中剔除，避免重複退料
  const addedRollNos = useMemo(() => {
    const nos = new Set<string>();
    items.forEach((item: any) => {
      if (item.extra) {
        item.extra.forEach((r: any) => {
          if (r.rollNo) {
            nos.add(r.rollNo);
          }
        });
      }
    });
    return nos;
  }, [items]);

  const availableWipRolls = useMemo(() => {
    return wipRolls.filter((r: any) => !addedRollNos.has(r.rollNo));
  }, [wipRolls, addedRollNos]);

  // 💡 新增掃描與直徑反算狀態及 Ref
  const scanInputRef = useRef<any>(null);
  const diaInputRef = useRef<any>(null);
  const [scanRollNo, setScanRollNo] = useState("");
  const [measuredDia, setMeasuredDia] = useState<number | null>(null);
  const [activeScanRoll, setActiveScanRoll] = useState<any | null>(null);
  const [calcResult, setCalcResult] = useState<{
    returnedLen: number;
    returnedArea: number;
    consumedLen: number;
    consumedPercent: number;
  } | null>(null);
  const [scanStorageCode, setScanStorageCode] = useState<string>("");
  const [scanCoreDia, setScanCoreDia] = useState<number | null>(null);
  const [lpnError, setLpnError] = useState<string>("");

  // 💡 用於在 Dialog/Modal 中以 Table 檢視已退回的 LPN 明細
  const [viewingExtraRolls, setViewingExtraRolls] = useState<any[] | null>(null);
  const [viewingExtraOpen, setViewingExtraOpen] = useState(false);
  const [viewingMaterialCode, setViewingMaterialCode] = useState("");
  const [isEditingDialogList, setIsEditingDialogList] = useState(false);
  const [dialogEditRolls, setDialogEditRolls] = useState<any[] | null>(null);

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

  // 💡 取得所有原料儲位 (用來提供入庫儲位下拉選單)
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

  // 2. 取得單據詳情
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

  const { data: requisitionsResponse } = useQuery({
    queryKey: ["requisitions", masterData.workOrderNumber],
    queryFn: () =>
      getApiV1WorkOrderRequisitionWoByWorkOrderNumber({
        path: { workOrderNumber: masterData.workOrderNumber! },
      }),
    enabled: !!masterData.workOrderNumber,
  });

  // 3. 取得該製令在車間領料的所有 WIP 卷卡 (用來判斷是否已全數辦理退料)
  const { data: allWipRollsRes } = useQuery({
    queryKey: ["wipRollsAll", masterData.workOrderNumber],
    queryFn: () => getApiV1WorkOrderReturnWipRolls({
      query: { workOrderNumber: masterData.workOrderNumber!, materialCode: "" }
    }),
    enabled: !!masterData.workOrderNumber,
  });

  const allWipRolls = (allWipRollsRes?.data as any)?.data || [];
  
  const remainingWipCount = useMemo(() => {
    return allWipRolls.filter((r: any) => !addedRollNos.has(r.rollNo)).length;
  }, [allWipRolls, addedRollNos]);

  const isAllWipReturned = allWipRolls.length > 0 && remainingWipCount === 0;

  const activeRecord = (detailResponse?.data as any)?.data || undefined;

  // 初始化或載入表頭/明細
  useEffect(() => {
    if (activeRecord) {
      setDocDate(dayjs(activeRecord.documentDate));
      setDocNotes(activeRecord.notes || "");
      setIsHeaderEditing(false);

      const mappedItems = (activeRecord.items || []).map((it: any) => {
        const extra: any[] = (() => {
          try {
            if (it.extraDataJson) {
              const rawExtra = JSON.parse(it.extraDataJson);
              if (Array.isArray(rawExtra)) {
                return rawExtra.map((r: any) => ({
                  materialCode: r.materialCode ?? r.MaterialCode,
                  rollNo: r.rollNo ?? r.RollNo,
                  widthMm: r.widthMm ?? r.WidthMm,
                  qtyAux: r.qtyAux ?? r.QtyAux,
                  thicknessMm: r.thicknessMm ?? r.ThicknessMm,
                  coreDiaMm: r.coreDiaMm ?? r.CoreDiaMm,
                  originalQtyAux: r.originalQtyAux ?? r.OriginalQtyAux,
                  wipQtyAux: r.wipQtyAux ?? r.WipQtyAux,
                  costPerSqm: r.costPerSqm ?? r.CostPerSqm,
                  storageCode: r.storageCode ?? r.StorageCode,
                  measuredDiaMm: r.measuredDiaMm ?? r.MeasuredDiaMm,
                }));
              }
            }
          } catch (e) {
            // ignore
          }
          return [];
        })();
        return {
          materialCode: it.materialCode,
          materialName: it.materialName,
          unit: it.unit,
          quantity: it.quantity,
          referenceQuantity1: it.referenceQuantity1,
          targetStorageCode: it.targetStorageCode || "",
          notes: it.notes || "",
          extra,
        };
      });
      setItems(mappedItems);
    }
  }, [activeRecord]);

  useEffect(() => {
    onEditingChange?.(isCreating || isHeaderEditing);
  }, [isCreating, isHeaderEditing, onEditingChange]);

  // 3. Mutations
  const createMutation = useMutation({
    mutationFn: (values: any) => postApiV1WorkOrderReturn({ body: values }),
    onSuccess: () => {
      message.success("退料單建立成功！");
      queryClient.invalidateQueries({
        queryKey: ["returns", masterData.workOrderNumber],
      });
      queryClient.invalidateQueries({
        queryKey: ["wipRollsAll", masterData.workOrderNumber],
      });
      justCreatedRef.current = false;
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
      queryClient.invalidateQueries({
        queryKey: ["returns", masterData.workOrderNumber],
      });
      queryClient.invalidateQueries({
        queryKey: ["wipRollsAll", masterData.workOrderNumber],
      });
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
      queryClient.invalidateQueries({
        queryKey: ["returns", masterData.workOrderNumber],
      });
      queryClient.invalidateQueries({
        queryKey: ["wipRollsAll", masterData.workOrderNumber],
      });
      queryClient.invalidateQueries({ queryKey: ["workorders"] });
      if (masterData?.workOrderNumber) {
        queryClient.invalidateQueries({ queryKey: ["workorder", masterData.workOrderNumber] });
      }
      setIsCreating(false);
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

  // confirmMutation was moved to WorkOrderDrawer header action "還料入庫"

  const cancelMutation = useMutation({
    mutationFn: () =>
      postApiV1WorkOrderReturnByDocumentNumberCancel({
        path: { documentNumber: activeDocNo! },
      }),
    onSuccess: () => {
      message.success("取消退料過帳成功！LPN 已恢復為車間 WIP 狀態");
      queryClient.invalidateQueries({ queryKey: ["return", activeDocNo] });
      queryClient.invalidateQueries({
        queryKey: ["returns", masterData.workOrderNumber],
      });
      queryClient.invalidateQueries({
        queryKey: ["wipRollsAll", masterData.workOrderNumber],
      });
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

  // handleConfirmPost was moved to WorkOrderDrawer header action "還料入庫"

  const handleCreateNewClick = () => {
    setIsCreating(true);
    setDocDate(dayjs());
    setDocNotes("");
    setItems([]);
  };

  const handleSave = (formValues: any) => {
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.materialCode) {
        message.warning("明細中的物料代碼不得為空！");
        return;
      }
      if (it.quantity <= 0) {
        message.warning(
          `物料 ${it.materialCode} 的退回長度必須大於 0，請勾選下方 WIP 卷卡並輸入退回長度！`,
        );
        return;
      }
    }

    const savedDate = formValues.documentDate
      ? dayjs(formValues.documentDate)
      : docDate;
    const savedNotes = formValues.notes || "";

    const postData = {
      referenceNumber: masterData.workOrderNumber!,
      documentDate: savedDate.format("YYYY-MM-DD"),
      notes: savedNotes || "",
      items: items.map((it) => ({
        materialCode: it.materialCode,
        targetStorageCode: it.targetStorageCode,
        notes: it.notes,
        extraDataJson: JSON.stringify(it.extra),
      })),
    };

    if (isCreating) {
      createMutation.mutate(postData);
    } else {
      updateMutation.mutate(postData);
    }
  };

  const handleAddNewItemClick = () => {
    if (isAllWipReturned) {
      message.warning("車間領料之所有卷卡已全數加入退料明細中，無法再新增項目");
      return;
    }
    setEditingItemIndex(null);
    setWipRolls([]);
    setItemModalOpen(true);
    setScanRollNo("");
    setActiveScanRoll(null);
    setMeasuredDia(null);
    setCalcResult(null);
    setScanStorageCode("");
    setScanCoreDia(null);
    setLpnError("");
    fetchWipRolls("");
  };

  // 💡 在已退回卷卡 (LPN) 明細彈窗中的編輯、刪除、儲存函式
  const handleDialogRollFieldChange = (rollNo: string, field: string, value: any) => {
    if (!dialogEditRolls) return;
    const updated = dialogEditRolls.map((r: any) => {
      if (r.rollNo === rollNo) {
        const nr = { ...r, [field]: value };
        // 當變更「實測外徑」時，即時重算「退回長度 (M)」
        if (field === "measuredDiaMm") {
          const Do = Number(value || 0);
          const Di = Number(nr.coreDiaMm || 86);
          const t = Number(nr.thicknessMm || 0.05);
          const maxWipQty = Number(nr.wipQtyAux ?? nr.qtyAux ?? 0);
          
          if (Do < Di) {
            nr.qtyAux = 0;
          } else {
            const calculatedLength = (Math.PI * (Do * Do - Di * Di)) / (4000 * t);
            nr.qtyAux = Math.max(0, Math.min(maxWipQty, parseFloat(calculatedLength.toFixed(2))));
          }
        }
        return nr;
      }
      return r;
    });
    setDialogEditRolls(updated);
  };

  const handleDialogRollDelete = (rollNo: string) => {
    if (!dialogEditRolls) return;
    modal.confirm({
      title: "確認刪除",
      content: `確定要自此退料明細中移除卷卡「${rollNo}」嗎？`,
      okText: "確定",
      cancelText: "取消",
      centered: true,
      onOk: () => {
        const updated = dialogEditRolls.filter((r: any) => r.rollNo !== rollNo);
        setDialogEditRolls(updated);
      }
    });
  };

  const handleDialogSave = () => {
    if (!dialogEditRolls) return;

    const updatedItems = items.map((it: any) => {
      if (it.materialCode === viewingMaterialCode) {
        const totalQty = dialogEditRolls.reduce((sum: number, r: any) => sum + (r.qtyAux ?? 0), 0);
        return {
          ...it,
          quantity: totalQty,
          extra: dialogEditRolls,
        };
      }
      return it;
    });

    const finalItems = updatedItems.filter((it: any) => it.extra && it.extra.length > 0);

    setItems(finalItems);
    saveItemsDirectly(finalItems);
    
    setViewingExtraRolls(dialogEditRolls);
    setIsEditingDialogList(false);
    message.success("已成功儲存並更新退回明細與長度！");
  };

  const saveItemsDirectly = (newItems: any[]) => {
    const postData = {
      referenceNumber: masterData.workOrderNumber!,
      documentDate: docDate.format("YYYY-MM-DD"),
      notes: docNotes || "",
      items: newItems.map((it) => ({
        materialCode: it.materialCode,
        targetStorageCode: it.targetStorageCode,
        notes: it.notes,
        extraDataJson: JSON.stringify(it.extra),
      })),
    };
    updateMutation.mutate(postData);
  };

  const handleRemoveItem = (index: number) => {
    modal.confirm({
      title: "確認刪除",
      content: `確定要刪除物料 ${items[index]?.materialCode} 的退料明細嗎？`,
      okText: "確認",
      cancelText: "取消",
      centered: true,
      onOk: () => {
        const updated = [...items];
        updated.splice(index, 1);
        setItems(updated);
        saveItemsDirectly(updated);
      },
    });
  };

  // 當退料料號變更時，自動獲取該料號在該製令 WIP 狀態中的所有可用卷卡 LPN
  const fetchWipRolls = async (val: string) => {
    try {
      setWipLoading(true);
      const res: any = await getApiV1WorkOrderReturnWipRolls({
        query: {
          workOrderNumber: masterData.workOrderNumber!,
          materialCode: val,
        },
      });
      const wipList = res.data?.data || [];
      setWipRolls(wipList);
      if (wipList.length === 0) {
        message.warning(
          `注意：${val ? "該料號 " + val : "本製令"} 目前在車間 WIP 現場無任何未結案的物料卷卡！`,
        );
        setItemModalOpen(false);
      } else {
        // 💡 檢查扣除已勾選後，是否還有未加入的可用 LPN
        const currentAddedNos = new Set<string>();
        items.forEach((item: any) => {
          if (item.extra) {
            item.extra.forEach((r: any) => {
              if (r.rollNo) currentAddedNos.add(r.rollNo);
            });
          }
        });
        const remainingCount = wipList.filter((r: any) => !currentAddedNos.has(r.rollNo)).length;
        if (remainingCount === 0) {
          message.warning(`注意：車間現場所有可退回卷卡已全數加入退料單明細中！`);
          setItemModalOpen(false);
        }
      }
      return wipList;
    } catch (e) {
      message.error("獲取 WIP 卷卡失敗：" + getApiErrorMessage(e));
      return [];
    } finally {
      setWipLoading(false);
    }
  };



  const handleScanRollConfirm = () => {
    if (!scanRollNo) return;
    
    const match = availableWipRolls.find((x: any) => x.rollNo.toUpperCase() === scanRollNo.toUpperCase().trim());
    if (!match) {
      message.error(`警告：卷號「${scanRollNo}」不在此製令的可退車間 WIP 列表中（或已被加入退料明細）！`);
      setScanRollNo("");
      scanInputRef.current?.focus();
      return;
    }
    
    setActiveScanRoll(match);
    setScanStorageCode(match.storageCode || "");
    setScanCoreDia(match.coreDiaMm || 86);
    setMeasuredDia(null);
    setCalcResult(null);
    
    // 自動焦點轉移至「直徑輸入框」
    setTimeout(() => {
      diaInputRef.current?.focus();
    }, 100);
  };

  const calculateLengthOnTheFly = (roll: any, dia: number, coreDia: number = (scanCoreDia as number) || 86) => {
    const Do = dia; // 實測外徑
    const Di = coreDia; // 紙芯外徑
    const t = Number(roll.thicknessMm || 0.05); // 厚度 (mm)
    
    if (Do < Di) {
      setCalcResult(null);
      return;
    }
    
    // 💡 核心物理公式反算長度 (M)
    const calculatedLength = (Math.PI * (Do * Do - Di * Di)) / (4000 * t);
    
    // 限制長度上限不可超過該卷卡在 WIP 的最大殘留量 (防呆)
    const maxWipQty = Number(roll.qtyAux);
    const finalQty = Math.max(0, Math.min(maxWipQty, parseFloat(calculatedLength.toFixed(2))));
    
    const finalArea = parseFloat(((finalQty * Number(roll.widthMm)) / 1000).toFixed(2));
    
    // 💡 自動計算該製令在這一卷上的「實質耗用量」
    const originalQty = Number(roll.originalQtyAux || maxWipQty);
    const consumedQty = parseFloat((maxWipQty - finalQty).toFixed(2));
    const consumedPct = parseFloat(((consumedQty / originalQty) * 100).toFixed(1));
    
    setCalcResult({
      returnedLen: finalQty,
      returnedArea: finalArea,
      consumedLen: consumedQty,
      consumedPercent: consumedPct
    });
  };

  const handleScanAndCalcSave = () => {
    if (!activeScanRoll || !measuredDia || !scanStorageCode || !scanCoreDia) {
      message.warning("請確保已輸入卷卡、測量直徑、內管芯外徑並選擇入庫儲位！");
      return;
    }
    
    const Do = measuredDia; // 實測外徑
    const Di = scanCoreDia; // 紙芯直徑
    const t = Number(activeScanRoll.thicknessMm || 0.05); // 厚度 (mm)
    
    if (Do < Di) {
      message.error(`輸入直徑 (${Do}mm) 低於紙管芯外徑 (${Di}mm)，請重新測量！`);
      return;
    }
    
    const calculatedLength = (Math.PI * (Do * Do - Di * Di)) / (4000 * t);
    const maxWipQty = Number(activeScanRoll.qtyAux);
    const finalQty = Math.max(0, Math.min(maxWipQty, parseFloat(calculatedLength.toFixed(2))));
    const finalArea = parseFloat(((finalQty * Number(activeScanRoll.widthMm)) / 1000).toFixed(2));
    
    const materialCode = activeScanRoll.materialCode ?? activeScanRoll.MaterialCode;
    const existingIndex = items.findIndex((x: any) => x.materialCode === materialCode);
    
    const rollDetail = {
      materialCode: activeScanRoll.materialCode ?? activeScanRoll.MaterialCode,
      rollNo: activeScanRoll.rollNo ?? activeScanRoll.RollNo,
      widthMm: activeScanRoll.widthMm ?? activeScanRoll.WidthMm,
      qtyAux: finalQty,
      thicknessMm: activeScanRoll.thicknessMm ?? activeScanRoll.ThicknessMm,
      coreDiaMm: scanCoreDia || 86,
      originalQtyAux: activeScanRoll.originalQtyAux ?? activeScanRoll.OriginalQtyAux,
      wipQtyAux: activeScanRoll.wipQtyAux ?? activeScanRoll.WipQtyAux ?? activeScanRoll.qtyAux ?? activeScanRoll.QtyAux,
      costPerSqm: activeScanRoll.costPerSqm ?? activeScanRoll.CostPerSqm,
      storageCode: scanStorageCode,
      measuredDiaMm: Do, // 實測外徑
    };
    
    let updatedItems = [...items];
    
    if (existingIndex > -1) {
      const existingItem = updatedItems[existingIndex];
      let updatedExtra = [...(existingItem.extra || [])];
      
      const rollIndex = updatedExtra.findIndex((x: any) => x.rollNo === activeScanRoll.rollNo);
      if (rollIndex > -1) {
        updatedExtra[rollIndex] = rollDetail;
      } else {
        updatedExtra.push(rollDetail);
      }
      
      const totalLen = updatedExtra.reduce((sum: number, r: any) => sum + r.qtyAux, 0);
      const totalArea = updatedExtra.reduce((sum: number, r: any) => sum + r.qtyAux * (r.widthMm / 1000), 0);
      
      updatedItems[existingIndex] = {
        ...existingItem,
        quantity: parseFloat(totalLen.toFixed(4)),
        referenceQuantity1: parseFloat(totalArea.toFixed(4)),
        targetStorageCode: scanStorageCode || "",
        extra: updatedExtra,
      };
    } else {
      const matchedRequisitionItem = reqItems.find((x: any) => x.materialCode === materialCode);
      const materialName = matchedRequisitionItem?.materialName || matchedRequisitionItem?.inventoryName || activeScanRoll.materialCode;
      
      updatedItems.push({
        materialCode: materialCode,
        materialName: materialName,
        unit: "M",
        quantity: finalQty,
        referenceQuantity1: finalArea,
        targetStorageCode: scanStorageCode || "",
        extra: [rollDetail],
      });
    }
    
    setItems(updatedItems);
    saveItemsDirectly(updatedItems);
    message.success(`卷卡 ${activeScanRoll.rollNo} 自動計算並成功加入退料！`);
    
    // 💡 檢查扣除新加入的這卷後，是否還有任何未加入的可用 WIP 卷卡
    const updatedAddedNos = new Set<string>();
    updatedItems.forEach((item: any) => {
      if (item.extra) {
        item.extra.forEach((r: any) => {
          if (r.rollNo) updatedAddedNos.add(r.rollNo);
        });
      }
    });
    const remainingCount = wipRolls.filter((r: any) => !updatedAddedNos.has(r.rollNo)).length;

    if (remainingCount === 0) {
      setItemModalOpen(false);
      message.info("車間現場所有可退回卷卡已全數加入退料單明細，已自動關閉彈窗！");
      // Reset scanner inputs
      setScanRollNo("");
      setActiveScanRoll(null);
      setMeasuredDia(null);
      setCalcResult(null);
      setScanStorageCode("");
      setScanCoreDia(86);
    } else {
      // Reset scanner inputs
      setScanRollNo("");
      setActiveScanRoll(null);
      setMeasuredDia(null);
      setCalcResult(null);
      setScanStorageCode("");
      setScanCoreDia(86);
      
      // Refocus on scanner input
      setTimeout(() => {
        scanInputRef.current?.focus();
      }, 100);
    }
  };

  const requisitionList = (requisitionsResponse?.data as any)?.data || [];
  const reqItems = requisitionList.flatMap((r: any) => r.items || []);

  const showHeaderForm = isCreating || !!activeDocNo;
  const isEditable = isCreating || isHeaderEditing;
  const isPosted = activeRecord && !!activeRecord.confirmDate;

  // 定義明細表格欄位
  const itemColumns = [
    {
      title: "操作",
      key: "action",
      width: 80,
      render: (_: any, __: any, index: number) => {
        if (isPosted) return null;
        return (
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleRemoveItem(index)}
          />
        );
      },
    },
    {
      title: "原料料號",
      dataIndex: "materialCode",
      key: "materialCode",
      width: 180,
      ellipsis: true,
    },
    {
      title: "原料名稱",
      dataIndex: "materialName",
      key: "materialName",
      width: 200,
      ellipsis: true,
    },
    {
      title: "幅寬(mm)",
      key: "widthMm",
      width: 100,
      align: "right" as const,
      render: (_: any, record: any) => {
        const width = record.extra?.[0]?.widthMm;
        return <span>{width ? `${width} mm` : "-"}</span>;
      },
    },
    {
      title: "退回長度(M)",
      dataIndex: "quantity",
      align: "right" as const,
      key: "quantity",
      width: 120,
      render: (v: number) => <strong>{v}</strong>,
    },
    {
      title: "退回面積(SQM)",
      dataIndex: "referenceQuantity1",
      align: "right" as const,
      key: "referenceQuantity1",
      width: 140,
      render: (v: number) => v?.toFixed(2),
    },
    {
      title: "餘料成本小計",
      key: "remainingMaterialCost",
      width: 140,
      align: "right" as const,
      render: (_: any, record: any) => {
        const calculatedCost = record.extra?.reduce((sum: number, r: any) => {
          const area = (r.qtyAux ?? 0) * ((r.widthMm ?? 0) / 1000);
          return sum + area * (r.costPerSqm ?? 0);
        }, 0) ?? 0;
        const displayCost = record.remainingMaterialCost ?? calculatedCost;
        return (
          <span className="font-bold text-green-500 dark:text-green-400">
            {displayCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        );
      },
    },
    {
      title: "退回卷卡明細",
      key: "details",
      width: 180,
      ellipsis: true,
      render: (_: any, record: any) => {
        const hasExtra = record.extra && record.extra.length > 0;
        return (
          <div className="inline-block">
            {hasExtra ? (
              <span 
                className="text-xs text-orange-400 underline decoration-dotted hover:text-orange-500 cursor-pointer font-semibold"
                onClick={() => {
                  setViewingExtraRolls(record.extra || []);
                  setViewingMaterialCode(record.materialCode);
                  setViewingExtraOpen(true);
                }}
              >
                🔍 已辦退 {record.extra.length} 卷 LPN (點擊檢視)
              </span>
            ) : (
              <span className="text-xs text-red-400 font-medium">尚未勾選任何 WIP 卷卡</span>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-4">
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
          <Empty description="尚未建立退料表" className="mt-10">
            <Button type="primary" onClick={handleCreateNewClick}>
              產生退料單
            </Button>
          </Empty>
        ) : (
          <div className="flex flex-col gap-4">
            {/* 退料單表頭 採用 DynamicForm */}
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
                        loading={
                          createMutation.isPending || updateMutation.isPending
                        }
                      >
                        儲存草稿
                      </Button>
                      <Button
                        size="small"
                        onClick={() =>
                          isCreating
                            ? setIsCreating(false)
                            : setIsHeaderEditing(false)
                        }
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
                                content:
                                  "確定要刪除這張退料單草稿嗎？此操作不可逆。",
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
                              content:
                                "確定要取消此退料單過帳嗎？這會把卷卡重新轉回 WIP 現場狀態。",
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
                  totalRemainingMaterialCost: Math.round(activeRecord?.totalRemainingMaterialCost ?? 0),
                }}
                onSubmit={handleSave}
                isViewMode={!isEditable}
                hideDefaultFooter={true}
              />
            </Card>

            {/* 退料明細 採用與 BOM 一致的 Table & Modal 架構 */}
            <Card
              size="small"
              title={<strong>📋 退回物料明細 (*僅支援卷料)</strong>}
              extra={
                !isPosted &&
                activeDocNo && (
                  <Tooltip title={isAllWipReturned ? "車間領料之所有卷卡已全數加入退料明細中，無法再新增項目" : ""}>
                    <Button
                      type="primary"
                      size="small"
                      icon={<PlusOutlined />}
                      disabled={isAllWipReturned}
                      onClick={handleAddNewItemClick}
                    >
                      新增退回物料
                    </Button>
                  </Tooltip>
                )
              }
            >
              <Table
                size="small"
                dataSource={items}
                columns={itemColumns}
                pagination={false}
                scroll={{ x: "max-content", y: 350 }}
                rowKey="materialCode"
                locale={{
                  emptyText: !activeDocNo
                    ? "⚠️ 請先點擊右上方「儲存草稿」保存表頭，即可開始新增退回物料明細。"
                    : "尚未加入任何退料明細項目，請點選右上方新增項目。",
                }}
              />
            </Card>
          </div>
        )}
      </Spin>

      {/* 退料明細項目編輯彈窗 採用 DynamicForm */}
      {itemModalOpen && (
        <Modal
          title={editingItemIndex !== null ? "編輯退回原料" : "新增退回原料"}
          open={itemModalOpen}
          onCancel={() => setItemModalOpen(false)}
          okText="確定"
          cancelText="取消"
          onOk={() => setItemModalOpen(false)}
          width="70vw"
          destroyOnHidden
        >
          <div className="py-4 space-y-4">
            {/* 📱 掃描卷卡與直徑反算快捷控制台 */}
            <div className="p-4 bg-slate-950 text-slate-100 rounded-lg shadow-inner border border-slate-800">
              <div className="text-sm font-bold text-slate-300 mb-4 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
                📱 模切捲料「掃描條碼 ➔ 實測外徑」快速退料過帳系統
              </div>
              
              <div className="grid grid-cols-12 gap-4 items-end">
                {/* 1. 掃描或輸入卷號 */}
                <div className="col-span-3 flex flex-col gap-1.5">
                  <span className="text-[11px] text-slate-400 font-medium">第一步：掃描原料二維碼/條碼</span>
                  <Input
                    ref={scanInputRef}
                    placeholder="請掃描或輸入卷號 (Roll No)..."
                    value={scanRollNo}
                    status={lpnError ? "error" : undefined}
                    allowClear={true}
                    onChange={e => {
                      const val = e.target.value;
                      setScanRollNo(val);
                      
                      // 💡 實時自動檢查候選清單：若與 LPN 清單吻合，效果等同點擊「選擇」！
                      if (val) {
                        const matched = availableWipRolls.find(
                          (x: any) => x.rollNo.toUpperCase() === val.toUpperCase().trim()
                        );
                        if (matched) {
                          setActiveScanRoll(matched);
                          setScanStorageCode(matched.storageCode || "");
                          setScanCoreDia(matched.coreDiaMm || 86);
                          setMeasuredDia(null);
                          setCalcResult(null);
                          setLpnError("");
                          
                          // 自動焦點轉移至「直徑輸入框」
                          setTimeout(() => {
                            diaInputRef.current?.focus();
                          }, 100);
                        } else {
                          setActiveScanRoll(null);
                          setCalcResult(null);
                          
                          // 💡 實時檢查是否存在於全量 WIP 中 (若在，表示已加入；否則為不屬於此製令)
                          const existsInOriginal = wipRolls.some(
                            (x: any) => x.rollNo.toUpperCase() === val.toUpperCase().trim()
                          );
                          if (existsInOriginal) {
                            setLpnError("此卷卡已加入退料明細，不可重複退料！");
                          } else {
                            setLpnError("此卷卡不屬於此製令領料單，或已在其他單據退回！");
                          }
                        }
                      } else {
                        setActiveScanRoll(null);
                        setCalcResult(null);
                        setLpnError("");
                        setScanStorageCode("");
                        setScanCoreDia(null);
                        setMeasuredDia(null);
                      }
                    }}
                    onPressEnter={handleScanRollConfirm}
                    className="bg-slate-900 text-slate-100 border-slate-700 focus:border-blue-500 font-mono text-xs h-9"
                  />
                  {lpnError && (
                    <div className="text-red-500 text-[10px] leading-tight mt-1 animate-pulse">
                      ⚠️ {lpnError}
                    </div>
                  )}
                </div>

                {/* 2. 使用卡尺量測目前直徑 */}
                <div className="col-span-2 flex flex-col gap-1.5">
                  <span className="text-[11px] text-slate-400 font-medium">第二步：實測外徑(mm)</span>
                  <div className="flex gap-1.5 items-center w-full">
                    <InputNumber
                      ref={diaInputRef}
                      placeholder="實測外徑"
                      value={measuredDia}
                      disabled={!activeScanRoll}
                      min={0}
                      addonAfter="mm"
                      onChange={val => {
                        setMeasuredDia(val);
                        if (val && activeScanRoll) {
                          calculateLengthOnTheFly(activeScanRoll, val, (scanCoreDia || 86) as number);
                        } else {
                          setCalcResult(null);
                        }
                      }}
                      onPressEnter={handleScanAndCalcSave}
                      className="bg-slate-900 text-slate-100 border-slate-700 focus:border-blue-500 font-mono text-xs flex-1 h-9"
                    />
                    {activeScanRoll && (
                      <Button
                        type="primary"
                        danger
                        className="h-9 px-2.5 bg-red-600 hover:bg-red-500 border-red-600 text-xs font-semibold text-white shrink-0 rounded"
                        onClick={() => {
                          const coreDia = (scanCoreDia || 86) as number;
                          setMeasuredDia(coreDia);
                          calculateLengthOnTheFly(activeScanRoll, coreDia, coreDia);
                        }}
                      >
                        耗盡
                      </Button>
                    )}
                  </div>
                </div>

                {/* 3. 管芯直徑 */}
                <div className="col-span-2 flex flex-col gap-1.5">
                  <span className="text-[11px] text-slate-400 font-medium">第三步：管芯直徑(mm)</span>
                  <InputNumber
                    placeholder="管芯直徑"
                    value={scanCoreDia}
                    disabled={true}
                    min={0}
                    addonAfter="mm"
                    className="bg-slate-900 text-slate-100 border-slate-700 focus:border-blue-500 font-mono text-xs w-full h-9"
                  />
                </div>

                {/* 4. 指定入庫目的儲位 */}
                <div className="col-span-3 flex flex-col gap-1.5">
                  <span className="text-[11px] text-slate-400 font-medium">第四步：指定入庫目的儲位</span>
                  <Select
                    placeholder="請選擇入庫儲位"
                    options={storageOptions}
                    value={scanStorageCode || undefined}
                    disabled={!activeScanRoll}
                    onChange={val => setScanStorageCode(val as string)}
                    className="bg-slate-900 text-slate-100 border-slate-700 focus:border-blue-500 font-mono text-xs w-full h-9"
                    dropdownStyle={{ zIndex: 1100 }}
                    getPopupContainer={triggerNode => triggerNode.parentElement}
                  />
                </div>

                {/* 5. 確認並加入退料按鈕 */}
                <div className="col-span-2">
                  <Button 
                    type="primary" 
                    className="w-full h-9 font-medium bg-blue-600 hover:bg-blue-500 border-blue-600"
                    disabled={!activeScanRoll || !measuredDia || !scanStorageCode || !scanCoreDia}
                    onClick={handleScanAndCalcSave}
                  >
                    確認並加入
                  </Button>
                </div>
              </div>

              {activeScanRoll && (
                <div className="mt-4 p-3 bg-slate-900 rounded border border-slate-800 grid grid-cols-2 gap-4 text-xs font-mono">
                  <div className="border-r border-slate-800 pr-4 space-y-1.5 text-slate-300">
                    <div>🔍 <strong>原料編號：</strong> <span className="text-slate-100">{activeScanRoll.materialCode}</span></div>
                    <div>🏷️ <strong>選中卷卡：</strong> <span className="text-blue-400 font-bold">{activeScanRoll.rollNo}</span></div>
                    <div>📐 <strong>物理參數：</strong> 厚度 {activeScanRoll.thicknessMm}mm | 原管芯 {activeScanRoll.coreDiaMm}mm</div>
                    <div>📦 <strong>來源儲位：</strong> <span className="text-yellow-500 font-semibold">{activeScanRoll.storageCode}</span></div>
                  </div>
                  
                  <div className="flex flex-col justify-center pl-2 space-y-1.5">
                    {calcResult ? (
                      <>
                        <div className="text-green-400 font-bold text-sm">
                          ✓ 計算退回庫存量: <span className="underline decoration-double">{calcResult.returnedLen} M</span> ({calcResult.returnedArea} SQM)
                        </div>
                        <div className="text-slate-400 text-[10px]">
                          (💡 實測長度為計算得出，不可手動修改)
                        </div>
                        <div className="text-orange-400 mt-1">
                          📊 本次製令消耗量: {calcResult.consumedLen} M ({calcResult.consumedPercent}%)
                        </div>
                      </>
                    ) : (
                      <div className="text-slate-500 italic animate-pulse">⏳ 請輸入當前外徑直徑...</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 選擇車間現場正在 WIP 狀態的 LPN 列表 */}
            <div className="bg-[var(--ant-color-fill-alter)] p-4 rounded-md border border-[var(--ant-color-border-secondary)]">
              <div className="text-xs font-bold text-[var(--ant-color-text-secondary)] mb-3 flex justify-between items-center">
                <span>🌀 車間現場可退回卷卡 (LPN) 列表</span>
                <span className="text-gray-400 font-normal">本製令共 {availableWipRolls.length} 卷現場物料</span>
              </div>
              <Spin spinning={wipLoading}>
                <Table
                  size="small"
                  dataSource={availableWipRolls}
                  pagination={{ pageSize: 5 }}
                  rowKey="rollNo"
                  locale={{
                    emptyText: "目前在 WIP 現場無任何可供退回的卷卡",
                  }}
                  columns={[
                    {
                      title: "原料編號",
                      dataIndex: "materialCode",
                      key: "materialCode",
                      width: 150,
                    },
                    {
                      title: "物料卷卡號 (LPN)",
                      dataIndex: "rollNo",
                      key: "rollNo",
                      width: 150,
                    },
                    {
                      title: "寬度",
                      dataIndex: "widthMm",
                      key: "widthMm",
                      width: 100,
                      render: (v) => `${v} mm`,
                    },
                    {
                      title: "內管芯外徑(mm)",
                      key: "coreDia",
                      width: 130,
                      render: (_, rec: any) => `${rec.coreDiaMm ?? 86} mm`,
                    },
                    {
                      title: "儲位",
                      dataIndex: "storageCode",
                      key: "storageCode",
                      width: 120,
                    },
                    {
                      title: "領料時長度",
                      dataIndex: "qtyAux",
                      key: "qtyAux",
                      width: 120,
                      render: (v) => <span className="text-blue-400 font-semibold">{v} M</span>,
                    },
                    {
                      title: "初始長度",
                      dataIndex: "originalQtyAux",
                      key: "originalQtyAux",
                      width: 120,
                      render: (v) => <span>{v} M</span>,
                    },
                    {
                      title: "操作",
                      key: "select",
                      width: 80,
                      render: (_, rec: any) => (
                        <Button
                          type="primary"
                          size="small"
                          onClick={() => {
                            setActiveScanRoll(rec);
                            setScanRollNo(rec.rollNo);
                            setScanStorageCode(rec.storageCode || "");
                            setScanCoreDia(rec.coreDiaMm || 86);
                            setMeasuredDia(null);
                            setCalcResult(null);
                            setTimeout(() => diaInputRef.current?.focus(), 100);
                          }}
                        >
                          選擇
                        </Button>
                      )
                    }
                  ]}
                />
              </Spin>
            </div>
          </div>
        </Modal>
      )}

      {/* 🔍 已退回 LPN 明細彈窗 (以 Table 呈現) */}
      {viewingExtraOpen && (
        <Modal
          title={
            <div className="text-slate-100 font-bold flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              📦 已退回卷卡 (LPN) 明細 — 原料料號: <span className="text-blue-400 font-mono text-sm font-bold">{viewingMaterialCode}</span>
              {isEditingDialogList && <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded font-normal">編輯中</span>}
            </div>
          }
          open={viewingExtraOpen}
          onCancel={() => {
            setViewingExtraOpen(false);
            setViewingExtraRolls(null);
            setViewingMaterialCode("");
            setIsEditingDialogList(false);
            setDialogEditRolls(null);
          }}
          footer={
            isEditingDialogList
              ? [
                  <Button key="save" type="primary" onClick={handleDialogSave} className="bg-green-600 hover:bg-green-500 border-green-600">
                    儲存
                  </Button>,
                  <Button key="cancel" danger onClick={() => setIsEditingDialogList(false)}>
                    取消
                  </Button>
                ]
              : [
                  !isPosted && (
                    <Button
                      key="edit"
                      type="primary"
                      onClick={() => {
                        setIsEditingDialogList(true);
                        setDialogEditRolls(JSON.parse(JSON.stringify(viewingExtraRolls || [])));
                      }}
                      className="bg-blue-600 hover:bg-blue-500 border-blue-600"
                    >
                      編輯
                    </Button>
                  ),
                  <Button key="close" onClick={() => {
                    setViewingExtraOpen(false);
                    setViewingExtraRolls(null);
                    setViewingMaterialCode("");
                  }}>
                    關閉
                  </Button>
                ].filter(Boolean)
          }
          width="75vw"
          centered
          destroyOnHidden
        >
          <div className="py-4">
            <Table
              size="small"
              dataSource={isEditingDialogList ? (dialogEditRolls || []) : (viewingExtraRolls || [])}
              pagination={false}
              rowKey="rollNo"
              columns={
                isEditingDialogList
                  ? [
                      {
                        title: "卷卡號 (LPN)",
                        dataIndex: "rollNo",
                        key: "rollNo",
                        width: 180,
                        render: (v: string) => <span className="font-mono font-bold text-slate-800 dark:text-slate-100">{v || "-"}</span>,
                      },
                      {
                        title: "退回儲位",
                        dataIndex: "storageCode",
                        key: "storageCode",
                        width: 150,
                        render: (v: string, r: any) => (
                          <Select
                            size="small"
                            className="w-full min-w-[120px]"
                            options={storageOptions}
                            value={v}
                            onChange={(val) => handleDialogRollFieldChange(r.rollNo, "storageCode", val)}
                          />
                        ),
                      },
                      {
                        title: "領料時長度",
                        dataIndex: "wipQtyAux",
                        key: "wipQtyAux",
                        width: 110,
                        align: "right" as const,
                        render: (v: number) => <span className="text-blue-500 font-semibold">{v ? `${v.toFixed(2)} M` : "-"}</span>,
                      },
                      {
                        title: "退回長度 (M)",
                        dataIndex: "qtyAux",
                        key: "qtyAux",
                        width: 110,
                        align: "right" as const,
                        render: (v: number) => <strong>{v?.toFixed(2)} M</strong>,
                      },
                      {
                        title: "退回面積 (SQM)",
                        key: "area",
                        width: 120,
                        align: "right" as const,
                        render: (_: any, r: any) => {
                          const area = (r.qtyAux ?? 0) * ((r.widthMm ?? 0) / 1000);
                          return <span className="font-semibold text-blue-500 dark:text-blue-400">{area.toFixed(2)} m²</span>;
                        },
                      },
                      {
                        title: "幅寬",
                        dataIndex: "widthMm",
                        key: "widthMm",
                        width: 100,
                        align: "right" as const,
                        render: (v: number) => <span>{v} mm</span>,
                      },
                      {
                        title: "厚度",
                        dataIndex: "thicknessMm",
                        key: "thicknessMm",
                        width: 100,
                        align: "right" as const,
                        render: (v: number) => <span>{v ? `${v} mm` : "-"}</span>,
                      },
                      {
                        title: "實測外徑",
                        dataIndex: "measuredDiaMm",
                        key: "measuredDiaMm",
                        width: 130,
                        align: "right" as const,
                        render: (v: number, r: any) => (
                          <InputNumber
                            size="small"
                            className="w-full min-w-[80px]"
                            min={0}
                            placeholder="外徑 (mm)"
                            value={v}
                            onChange={(val) => handleDialogRollFieldChange(r.rollNo, "measuredDiaMm", val)}
                            onFocus={(e) => e.target.select()}
                          />
                        ),
                      },
                      {
                        title: "管芯直徑",
                        dataIndex: "coreDiaMm",
                        key: "coreDiaMm",
                        width: 100,
                        align: "right" as const,
                        render: (v: number) => <span>{v ? `${v} mm` : "86 mm"}</span>,
                      },
                      {
                        title: "餘料成本小計",
                        key: "cost",
                        width: 140,
                        align: "right" as const,
                        render: (_: any, r: any) => {
                          const area = (r.qtyAux ?? 0) * ((r.widthMm ?? 0) / 1000);
                          const cost = area * (r.costPerSqm ?? 0);
                          return (
                            <span className="font-bold text-green-500 dark:text-green-400">
                              {cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          );
                        },
                      },
                      {
                        title: "操作",
                        key: "dialogAction",
                        width: 85,
                        align: "center" as const,
                        render: (_: any, r: any) => (
                          <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => handleDialogRollDelete(r.rollNo)}
                          />
                        ),
                      }
                    ]
                  : [
                      {
                        title: "卷卡號 (LPN)",
                        dataIndex: "rollNo",
                        key: "rollNo",
                        width: 180,
                        render: (v: string) => <span className="font-mono font-bold text-slate-800 dark:text-slate-100">{v || "-"}</span>,
                      },
                      {
                        title: "退回儲位",
                        dataIndex: "storageCode",
                        key: "storageCode",
                        width: 120,
                        render: (v: string) => <span className="font-mono text-yellow-500 font-semibold">{v || "-"}</span>,
                      },
                      {
                        title: "領料時長度",
                        dataIndex: "wipQtyAux",
                        key: "wipQtyAux",
                        width: 110,
                        align: "right" as const,
                        render: (v: number) => <span className="text-blue-500 font-semibold">{v ? `${v.toFixed(2)} M` : "-"}</span>,
                      },
                      {
                        title: "退回長度 (M)",
                        dataIndex: "qtyAux",
                        key: "qtyAux",
                        width: 110,
                        align: "right" as const,
                        render: (v: number) => <strong>{v?.toFixed(2)} M</strong>,
                      },
                      {
                        title: "退回面積 (SQM)",
                        key: "area",
                        width: 120,
                        align: "right" as const,
                        render: (_: any, r: any) => {
                          const area = (r.qtyAux ?? 0) * ((r.widthMm ?? 0) / 1000);
                          return <span className="font-semibold text-blue-500 dark:text-blue-400">{area.toFixed(2)} m²</span>;
                        },
                      },
                      {
                        title: "幅寬",
                        dataIndex: "widthMm",
                        key: "widthMm",
                        width: 100,
                        align: "right" as const,
                        render: (v: number) => <span>{v} mm</span>,
                      },
                      {
                        title: "厚度",
                        dataIndex: "thicknessMm",
                        key: "thicknessMm",
                        width: 100,
                        align: "right" as const,
                        render: (v: number) => <span>{v ? `${v} mm` : "-"}</span>,
                      },
                      {
                        title: "實測外徑",
                        dataIndex: "measuredDiaMm",
                        key: "measuredDiaMm",
                        width: 110,
                        align: "right" as const,
                        render: (v: number) => <span>{v ? `${v} mm` : "-"}</span>,
                      },
                      {
                        title: "管芯直徑",
                        dataIndex: "coreDiaMm",
                        key: "coreDiaMm",
                        width: 100,
                        align: "right" as const,
                        render: (v: number) => <span>{v ? `${v} mm` : "86 mm"}</span>,
                      },
                      {
                        title: "餘料成本小計",
                        key: "cost",
                        width: 140,
                        align: "right" as const,
                        render: (_: any, r: any) => {
                          const area = (r.qtyAux ?? 0) * ((r.widthMm ?? 0) / 1000);
                          const cost = area * (r.costPerSqm ?? 0);
                          return (
                            <span className="font-bold text-green-500 dark:text-green-400">
                              {cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          );
                        },
                      }
                    ]
              }
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
