import { useState, useEffect, useRef } from "react";
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
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  SaveOutlined,
  CheckCircleOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getApiV1WorkOrderReturnWoByWorkOrderNumber,
  getApiV1WorkOrderReturnByDocumentNumber,
  postApiV1WorkOrderReturn,
  putApiV1WorkOrderReturnByDocumentNumber,
  postApiV1WorkOrderReturnByDocumentNumberConfirm,
  postApiV1WorkOrderReturnByDocumentNumberCancel,
  deleteApiV1WorkOrderReturnByDocumentNumber,
  getApiV1WorkOrderReturnWipRolls,
} from "@/api/generated/sdk.gen";
import { getApiErrorMessage } from "@/utils/apiError";
import dayjs from "dayjs";
import type { WorkOrderDto } from "@/api/generated/types.gen";
import { DynamicForm } from "@/components/Form/DynamicForm";
import {
  returnHeaderFormConfig,
  returnItemFormConfig,
} from "./WorkOrderConfig";

interface WorkOrderReturnTabProps {
  masterData: WorkOrderDto;
}

export function WorkOrderReturnTab({ masterData }: WorkOrderReturnTabProps) {
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
  const [modalFormValues, setModalFormValues] = useState<any>({});
  const [modalExtra, setModalExtra] = useState<any[]>([]);
  const [wipRolls, setWipRolls] = useState<any[]>([]);
  const [wipLoading, setWipLoading] = useState(false);

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

  const activeRecord = (detailResponse?.data as any)?.data || undefined;

  // 初始化或載入表頭/明細
  useEffect(() => {
    if (activeRecord) {
      setDocDate(dayjs(activeRecord.documentDate));
      setDocNotes(activeRecord.notes || "");

      if (justCreatedRef.current) {
        setIsHeaderEditing(true);
        justCreatedRef.current = false;
      } else {
        setIsHeaderEditing(false);
      }

      const mappedItems = (activeRecord.items || []).map((it: any) => {
        let extra = [];
        try {
          if (it.extraDataJson) {
            extra = JSON.parse(it.extraDataJson);
          }
        } catch (e) {
          extra = [];
        }
        return {
          materialCode: it.materialCode,
          materialName: it.materialName,
          unit: it.unit,
          quantity: it.quantity,
          referenceQuantity1: it.referenceQuantity1,
          targetStorageCode: it.targetStorageCode || "TW-MAT-GEN",
          notes: it.notes || "",
          extra,
        };
      });
      setItems(mappedItems);
    }
  }, [activeRecord]);

  // 3. Mutations
  const createMutation = useMutation({
    mutationFn: (values: any) => postApiV1WorkOrderReturn({ body: values }),
    onSuccess: () => {
      message.success("退料單建立成功！");
      queryClient.invalidateQueries({
        queryKey: ["returns", masterData.workOrderNumber],
      });
      justCreatedRef.current = true; // 💡 標記為剛建立，保留編輯狀態
      setIsCreating(false);
      setIsHeaderEditing(true); // 💡 建立成功後，自動進入編輯狀態，以便新增明細
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

  const confirmMutation = useMutation({
    mutationFn: () =>
      postApiV1WorkOrderReturnByDocumentNumberConfirm({
        path: { documentNumber: activeDocNo! },
      }),
    onSuccess: () => {
      message.success("退料確認過帳成功！剩餘卷料已還原至倉庫可用狀態");
      queryClient.invalidateQueries({ queryKey: ["return", activeDocNo] });
      queryClient.invalidateQueries({
        queryKey: ["returns", masterData.workOrderNumber],
      });
      refetchDetail();
      refetchList();
    },
    onError: (error) => {
      modal.error({
        title: "退料過帳失敗",
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
      queryClient.invalidateQueries({
        queryKey: ["returns", masterData.workOrderNumber],
      });
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

  const handleConfirmPost = () => {
    if (items.length === 0) {
      message.warning(
        "此退料單尚無任何明細項目，請先編輯並點選下方「新增退回物料」加入項目！",
      );
      return;
    }
    confirmMutation.mutate();
  };

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
          `物料 ${it.materialCode} 的退回數量必須大於 0，請勾選下方 WIP 卷卡並輸入退回長度！`,
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
    setEditingItemIndex(null);
    setModalFormValues({
      materialCode: "",
      targetStorageCode: "TW-MAT-GEN",
      quantity: 0,
      referenceQuantity1: 0,
    });
    setModalExtra([]);
    setWipRolls([]);
    setItemModalOpen(true);
  };

  const handleEditItemClick = async (index: number) => {
    const it = items[index];
    setEditingItemIndex(index);
    setModalFormValues({
      materialCode: it.materialCode,
      targetStorageCode: it.targetStorageCode,
      quantity: it.quantity,
      referenceQuantity1: it.referenceQuantity1,
    });
    setModalExtra(it.extra || []);
    setItemModalOpen(true);

    // 獲取該料號對應的 WIP rolls
    await fetchWipRolls(it.materialCode);
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
          `注意：該料號 ${val} 目前在車間 WIP 現場無任何未結案的物料卷卡！`,
        );
      }
    } catch (e) {
      message.error("獲取 WIP 卷卡失敗：" + getApiErrorMessage(e));
    } finally {
      setWipLoading(false);
    }
  };

  // 💡 掃描器自動勾選並修改該卷長度，連帶更新 Modal 總量表頭
  const handleWipRollQtyUpdate = (rollNo: string, qty: number, width: number) => {
    let updatedExtra = [...modalExtra];
    const idx = updatedExtra.findIndex((x: any) => x.rollNo === rollNo);
    
    if (idx >= 0) {
      updatedExtra[idx].qtyAux = qty;
    } else {
      updatedExtra.push({ rollNo, widthMm: width, qtyAux: qty });
    }
    
    setModalExtra(updatedExtra);
    
    const totalLen = updatedExtra.reduce(
      (sum: number, r: any) => sum + r.qtyAux,
      0,
    );
    const totalArea = updatedExtra.reduce(
      (sum: number, r: any) => sum + r.qtyAux * (r.widthMm / 1000),
      0,
    );
    
    setModalFormValues((prev: any) => ({
      ...prev,
      quantity: parseFloat(totalLen.toFixed(4)),
      referenceQuantity1: parseFloat(totalArea.toFixed(4)),
    }));
  };

  const handleScanRollConfirm = () => {
    if (!scanRollNo) return;
    
    const match = wipRolls.find((x: any) => x.rollNo.toUpperCase() === scanRollNo.toUpperCase().trim());
    if (!match) {
      message.error(`警告：卷號「${scanRollNo}」不在此製令的車間 WIP 列表中！`);
      setScanRollNo("");
      scanInputRef.current?.focus();
      return;
    }
    
    setActiveScanRoll(match);
    setMeasuredDia(null);
    setCalcResult(null);
    
    // 自動焦點轉移至「直徑輸入框」
    setTimeout(() => {
      diaInputRef.current?.focus();
    }, 100);
  };

  const handleDiameterCalcConfirm = () => {
    if (!activeScanRoll || !measuredDia) return;
    
    const Do = measuredDia; // 實測外徑
    const Di = Number(activeScanRoll.coreDiaMm || 76.2); // 紙芯外徑
    const t = Number(activeScanRoll.thicknessMm || 0.05); // 厚度 (mm)
    
    if (Do < Di) {
      message.error(`輸入直徑 (${Do}mm) 低於紙芯外徑 (${Di}mm)，請重新測量！`);
      return;
    }
    
    // 💡 核心物理公式反算長度 (M)
    const calculatedLength = (Math.PI * (Do * Do - Di * Di)) / (4000 * t);
    
    // 限制長度上限不可超過該卷卡在 WIP 的最大殘留量 (防呆)
    const maxWipQty = Number(activeScanRoll.qtyAux);
    const finalQty = Math.max(0, Math.min(maxWipQty, parseFloat(calculatedLength.toFixed(2))));
    
    const finalArea = parseFloat(((finalQty * Number(activeScanRoll.widthMm)) / 1000).toFixed(2));
    
    // 💡 自動計算該製令在這一卷上的「實質耗用量」
    const originalQty = Number(activeScanRoll.originalQtyAux || maxWipQty);
    const consumedQty = parseFloat((maxWipQty - finalQty).toFixed(2));
    const consumedPct = parseFloat(((consumedQty / originalQty) * 100).toFixed(1));
    
    setCalcResult({
      returnedLen: finalQty,
      returnedArea: finalArea,
      consumedLen: consumedQty,
      consumedPercent: consumedPct
    });
    
    // 自動更新至勾選退料明細中
    handleWipRollQtyUpdate(activeScanRoll.rollNo, finalQty, activeScanRoll.widthMm);
    message.success(`卷卡 ${activeScanRoll.rollNo} 自動計算完成：退回 ${finalQty}M，本次耗用 ${consumedQty}M (${consumedPct}%)`);
    
    // 重置掃描面板並自動 Refocus 準備掃描下一卷
    setTimeout(() => {
      setScanRollNo("");
      setActiveScanRoll(null);
      setMeasuredDia(null);
      setCalcResult(null);
      scanInputRef.current?.focus(); // 自動聚焦回掃描框
    }, 1200);
  };

  const handleWipRollCheck = (
    rollNo: string,
    checked: boolean,
    defaultQty: number,
    widthMm: number,
  ) => {
    let updatedExtra = [...modalExtra];
    if (checked) {
      const exists = updatedExtra.find((x: any) => x.rollNo === rollNo);
      if (!exists) {
        updatedExtra.push({
          rollNo,
          widthMm,
          qtyAux: defaultQty,
        });
      }
    } else {
      updatedExtra = updatedExtra.filter((x: any) => x.rollNo !== rollNo);
    }

    setModalExtra(updatedExtra);
    const totalLen = updatedExtra.reduce(
      (sum: number, r: any) => sum + r.qtyAux,
      0,
    );
    const totalArea = updatedExtra.reduce(
      (sum: number, r: any) => sum + r.qtyAux * (r.widthMm / 1000),
      0,
    );

    setModalFormValues((prev: any) => ({
      ...prev,
      quantity: parseFloat(totalLen.toFixed(4)),
      referenceQuantity1: parseFloat(totalArea.toFixed(4)),
    }));
  };

  const handleWipRollQtyChange = (rollNo: string, val: number | null) => {
    const updatedExtra = [...modalExtra];
    const roll = updatedExtra.find((x: any) => x.rollNo === rollNo);
    if (roll) {
      roll.qtyAux = val || 0;
    }

    setModalExtra(updatedExtra);
    const totalLen = updatedExtra.reduce(
      (sum: number, r: any) => sum + r.qtyAux,
      0,
    );
    const totalArea = updatedExtra.reduce(
      (sum: number, r: any) => sum + r.qtyAux * (r.widthMm / 1000),
      0,
    );

    setModalFormValues((prev: any) => ({
      ...prev,
      quantity: parseFloat(totalLen.toFixed(4)),
      referenceQuantity1: parseFloat(totalArea.toFixed(4)),
    }));
  };

  const handleModalSave = () => {
    if (!modalFormValues.materialCode) {
      message.warning("請先選取退回原料料號！");
      return;
    }
    if (modalFormValues.quantity <= 0) {
      message.warning(
        "退回數量必須大於 0，請勾選下方 WIP 卷卡並輸入退回長度！",
      );
      return;
    }

    const matched = materialsList.find(
      (x) => x.materialCode === modalFormValues.materialCode,
    );
    const newItem = {
      materialCode: modalFormValues.materialCode,
      materialName: matched?.materialName || "",
      unit: "M",
      quantity: modalFormValues.quantity,
      referenceQuantity1: modalFormValues.referenceQuantity1,
      targetStorageCode: null,
      extra: modalExtra,
    };

    const updated = [...items];
    if (editingItemIndex !== null) {
      updated[editingItemIndex] = newItem;
    } else {
      updated.push(newItem);
    }
    setItems(updated);
    setItemModalOpen(false);
    saveItemsDirectly(updated);
  };

  const filteredMaterials = Array.isArray(masterData.items)
    ? masterData.items
        .filter(
          (m: any) =>
            m.materialForm === "R" || m.materialCode?.startsWith("R-"),
        )
        .map((x: any) => ({
          materialCode: x.materialCode,
          materialName: x.materialName,
        }))
    : [];

  const materialsList = Array.isArray(masterData.items)
    ? masterData.items.map((x: any) => {
        let form = x.materialForm;
        if (!form || (form !== "R" && form !== "S")) {
          if (x.materialCode?.startsWith("R-")) form = "R";
          else if (x.materialCode?.startsWith("S-")) form = "S";
        }
        return {
          materialCode: x.materialCode,
          materialName: x.materialName,
          materialForm: form,
        };
      })
    : [];

  const showHeaderForm = isCreating || !!activeDocNo;
  const isEditable = isCreating || isHeaderEditing;
  const isPosted = activeRecord && !!activeRecord.confirmDate;

  // 定義明細表格欄位
  const itemColumns = [
    {
      title: "操作",
      key: "action",
      width: 100,
      render: (_: any, __: any, index: number) => {
        if (isPosted) return null;
        return (
          <Space>
            <Button
              type="text"
              className="text-blue-500 p-0"
              icon={<EditOutlined />}
              onClick={() => handleEditItemClick(index)}
            />
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleRemoveItem(index)}
            />
          </Space>
        );
      },
    },
    {
      title: "原料料號",
      dataIndex: "materialCode",
      key: "materialCode",
      width: 200,
      ellipsis: true,
    },
    {
      title: "原料名稱",
      dataIndex: "materialName",
      key: "materialName",
      width: 200,
      ellipsis: true,
    },
    { title: "單位", dataIndex: "unit", key: "unit", width: 80 },
    {
      title: "退回數量(M)",
      dataIndex: "quantity",
      key: "quantity",
      width: 120,
      render: (v: number) => <strong>{v}</strong>,
    },
    {
      title: "退回面積(SQM)",
      dataIndex: "referenceQuantity1",
      key: "referenceQuantity1",
      width: 140,
      render: (v: number) => v?.toFixed(2),
    },
    {
      title: "退回目的儲位",
      dataIndex: "targetStorageCode",
      key: "targetStorageCode",
      render: () => "-",
    },
    {
      title: "退回卷卡明細",
      key: "details",
      render: (_: any, record: any) => (
        <div>
          <Tag color="orange">捲材</Tag>
          {record.extra && record.extra.length > 0 ? (
            <span className="text-xs text-gray-400">
              已辦退 {record.extra.length} 卷 LPN
            </span>
          ) : (
            <span className="text-xs text-red-400">尚未勾選任何 WIP 卷卡</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {masterData.pendingWipRollsCount > 0 ? (
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
      ) : (masterData.pendingWipRollsCount === 0 && masterData.warehousingCompleteDate ? (
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
                            type="primary"
                            size="small"
                            className="bg-green-600 hover:bg-green-700 border-green-600"
                            icon={<CheckCircleOutlined />}
                            onClick={handleConfirmPost}
                            loading={confirmMutation.isPending}
                          >
                            確認退料
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
                  <Button
                    type="primary"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={handleAddNewItemClick}
                  >
                    新增退回物料
                  </Button>
                )
              }
            >
              <Table
                size="small"
                dataSource={items}
                columns={itemColumns}
                pagination={false}
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
          onOk={handleModalSave}
          width="60vw"
          destroyOnClose
        >
          <div className="py-4 space-y-4">
            <DynamicForm
              formId="returnItemForm"
              fields={returnItemFormConfig(filteredMaterials) as any}
              defaultValues={{
                materialCode: modalFormValues.materialCode,
                targetStorageCode: modalFormValues.targetStorageCode,
                quantity: modalFormValues.quantity,
                referenceQuantity1: modalFormValues.referenceQuantity1,
              }}
              onSubmit={() => {}}
              onValuesChange={async (values: any) => {
                if (
                  values.materialCode !== modalFormValues.materialCode ||
                  values.targetStorageCode !== modalFormValues.targetStorageCode
                ) {
                  const updatedValues = {
                    ...modalFormValues,
                    materialCode: values.materialCode,
                    targetStorageCode: values.targetStorageCode,
                  };

                  if (values.materialCode !== modalFormValues.materialCode) {
                    // 料號變更，初始化 WIP 列表
                    updatedValues.quantity = 0;
                    updatedValues.referenceQuantity1 = 0;
                    setModalExtra([]);
                    setWipRolls([]);
                    if (values.materialCode) {
                      await fetchWipRolls(values.materialCode);
                    }
                  }

                  setModalFormValues(updatedValues);
                }
              }}
              isViewMode={false}
              hideDefaultFooter={true}
            />

            {/* 📱 掃描卷卡與直徑反算快捷控制台 */}
            {modalFormValues.materialCode && (
              <div className="p-4 bg-slate-900 text-slate-100 rounded-lg shadow-inner border border-slate-700">
                <div className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  📱 模切捲料「掃描條碼 ➔ 實測外徑」快速退料過帳系統
                </div>
                
                <div className="grid grid-cols-12 gap-3 items-center">
                  <div className="col-span-5 flex flex-col gap-1">
                    <span className="text-[11px] text-slate-400 font-medium">第一步：掃描原料二維碼/條碼</span>
                    <Input
                      ref={scanInputRef}
                      placeholder="請掃描卷卡條碼 (Roll No)..."
                      value={scanRollNo}
                      onChange={e => setScanRollNo(e.target.value)}
                      onPressEnter={handleScanRollConfirm}
                      className="bg-slate-800 text-slate-100 border-slate-600 focus:border-blue-500 font-mono text-xs h-9"
                    />
                  </div>

                  <div className="col-span-4 flex flex-col gap-1">
                    <span className="text-[11px] text-slate-400 font-medium">第二步：使用卡尺量測目前直徑</span>
                    <InputNumber
                      ref={diaInputRef}
                      placeholder="實測直徑 (OD)"
                      value={measuredDia}
                      disabled={!activeScanRoll}
                      min={0}
                      addonAfter="mm"
                      onChange={val => setMeasuredDia(val)}
                      onPressEnter={handleDiameterCalcConfirm}
                      className="bg-slate-800 text-slate-100 border-slate-600 focus:border-blue-500 font-mono text-xs w-full h-9"
                    />
                  </div>

                  <div className="col-span-3 pt-5">
                    <Button 
                      type="primary" 
                      className="w-full h-9 font-medium bg-blue-600 hover:bg-blue-500 border-blue-600"
                      disabled={!activeScanRoll || !measuredDia}
                      onClick={handleDiameterCalcConfirm}
                    >
                      確認並加入退料
                    </Button>
                  </div>
                </div>

                {activeScanRoll && (
                  <div className="mt-4 p-3 bg-slate-800 rounded border border-slate-700 grid grid-cols-2 gap-4 text-xs font-mono">
                    <div className="border-r border-slate-700 pr-4 space-y-1 text-slate-300">
                      <div>🔍 <strong>選中卷卡：</strong> <span className="text-blue-400">{activeScanRoll.rollNo}</span></div>
                      <div>📐 <strong>物理參數：</strong> 厚度 {activeScanRoll.thicknessMm}mm | 紙管 {activeScanRoll.coreDiaMm}mm</div>
                      <div>📦 <strong>車間 WIP：</strong> {activeScanRoll.qtyAux} M ({((activeScanRoll.qtyAux * activeScanRoll.widthMm)/1000).toFixed(2)} SQM)</div>
                    </div>
                    
                    <div className="flex flex-col justify-center pl-2 space-y-1">
                      {calcResult ? (
                        <>
                          <div className="text-green-400 font-bold">✓ 計算退回庫存量: {calcResult.returnedLen} M ({calcResult.returnedArea} SQM)</div>
                          <div className="text-orange-400">📊 本次製令消耗量: {calcResult.consumedLen} M ({calcResult.consumedPercent}%)</div>
                        </>
                      ) : (
                        <div className="text-slate-500 italic animate-pulse">⏳ 請輸入當前直徑並按下 Enter...</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 選擇車間現場正在 WIP 狀態的 LPN 列表 */}
            {modalFormValues.materialCode && (
              <div className="bg-[var(--ant-color-fill-alter)] p-4 rounded-md mt-4 border border-[var(--ant-color-border-secondary)]">
                <div className="text-xs font-bold text-[var(--ant-color-text-secondary)] mb-3">
                  🌀 勾選欲辦理退料回庫的 WIP 現場卷卡 (LPN)
                </div>
                <Spin spinning={wipLoading}>
                  <Table
                    size="small"
                    dataSource={wipRolls}
                    pagination={false}
                    rowKey="rollNo"
                    locale={{
                      emptyText: "目前在 WIP 現場無任何可供退回的卷卡",
                    }}
                    rowSelection={{
                      type: "checkbox",
                      selectedRowKeys: modalExtra.map((x: any) => x.rollNo),
                      onSelect: (rec: any, selected: boolean) => {
                        handleWipRollCheck(
                          rec.rollNo,
                          selected,
                          rec.qtyAux,
                          rec.widthMm,
                        );
                      },
                      onSelectAll: (
                        selected: boolean,
                        selectedRowsList: any[],
                      ) => {
                        if (selected) {
                          const updatedExtra = selectedRowsList.map(
                            (r: any) => ({
                              rollNo: r.rollNo,
                              widthMm: r.widthMm,
                              qtyAux: r.qtyAux,
                            }),
                          );
                          setModalExtra(updatedExtra);
                          const totalLen = updatedExtra.reduce(
                            (sum: number, r: any) => sum + r.qtyAux,
                            0,
                          );
                          const totalArea = updatedExtra.reduce(
                            (sum: number, r: any) =>
                              sum + r.qtyAux * (r.widthMm / 1000),
                            0,
                          );
                          setModalFormValues((prev: any) => ({
                            ...prev,
                            quantity: parseFloat(totalLen.toFixed(4)),
                            referenceQuantity1: parseFloat(
                              totalArea.toFixed(4),
                            ),
                          }));
                        } else {
                          setModalExtra([]);
                          setModalFormValues((prev: any) => ({
                            ...prev,
                            quantity: 0,
                            referenceQuantity1: 0,
                          }));
                        }
                      },
                    }}
                    columns={[
                      {
                        title: "物料卷卡號 (LPN)",
                        dataIndex: "rollNo",
                        key: "rollNo",
                      },
                      {
                        title: "WIP 寬度",
                        dataIndex: "widthMm",
                        key: "widthMm",
                        render: (v) => `${v} mm`,
                      },
                      {
                        title: "WIP 現場殘留量",
                        dataIndex: "qtyAux",
                        key: "qtyAux",
                        render: (v) => <span>{v} M</span>,
                      },
                      {
                        title: "退回實測長度 (M)",
                        key: "returnedQty",
                        render: (_, rec: any) => {
                          const checked = modalExtra.find(
                            (x: any) => x.rollNo === rec.rollNo,
                          );
                          return (
                            <InputNumber
                              size="small"
                              style={{ width: "130px" }}
                              placeholder="請輸入退回量"
                              disabled={!checked}
                              value={checked ? checked.qtyAux : undefined}
                              max={rec.qtyAux}
                              min={0}
                              onChange={(val: any) =>
                                handleWipRollQtyChange(rec.rollNo, val)
                              }
                            />
                          );
                        },
                      },
                    ]}
                  />
                </Spin>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
