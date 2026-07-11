import { useState, useEffect, useRef } from "react";
import { Card, Table, Tag, Space, Button, Empty, App, Spin, Modal, InputNumber, Tooltip } from "antd";
import { PlusOutlined, DeleteOutlined, EditOutlined, SaveOutlined, CheckCircleOutlined, SyncOutlined } from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getApiV1WorkOrderRequisitionWoByWorkOrderNumber,
  getApiV1WorkOrderRequisitionByDocumentNumber,
  postApiV1WorkOrderRequisition,
  putApiV1WorkOrderRequisitionByDocumentNumber,
  postApiV1WorkOrderRequisitionByDocumentNumberConfirm,
  postApiV1WorkOrderRequisitionByDocumentNumberCancel,
  deleteApiV1WorkOrderRequisitionByDocumentNumber,
  getApiV1WorkOrderRequisitionSelectableRolls,
  getApiV1MaterialInventoryLogical,
  getApiV1WorkOrderRequisitionFifo
} from "@/api/generated/sdk.gen";
import { getApiErrorMessage } from "@/utils/apiError";
import dayjs from "dayjs";
import type { WorkOrderDto } from "@/api/generated/types.gen";
import { DynamicForm } from "@/components/Form/DynamicForm";
import { requisitionHeaderFormConfig, requisitionItemFormConfig } from "./WorkOrderConfig";

interface WorkOrderRequisitionTabProps {
  masterData: WorkOrderDto;
}

export function WorkOrderRequisitionTab({
  masterData,
}: WorkOrderRequisitionTabProps) {
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();

  const [isCreating, setIsCreating] = useState(false);
  const [isHeaderEditing, setIsHeaderEditing] = useState(false);
  const justCreatedRef = useRef(false);

  // 領料主檔表頭編輯狀態
  const [docDate, setDocDate] = useState<dayjs.Dayjs>(dayjs());
  const [docNotes, setDocNotes] = useState("");

  // 明細項目狀態
  const [items, setItems] = useState<any[]>([]);

  // 彈窗控制狀態
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);

  // 彈窗內的暫存欄位狀態
  const [modalFormValues, setModalFormValues] = useState<any>({});
  const [modalExtra, setModalExtra] = useState<any[]>([]);
  const [sheetDrawQty, setSheetDrawQty] = useState<Record<string, number>>({});
  const [isAutoAllocating, setIsAutoAllocating] = useState(false);

  const handleAutoAllocateAll = async () => {
    if (materialsList.length === 0) {
      message.warning("BOM 組成原料清單為空，無法進行自動配料！");
      return;
    }
    
    setIsAutoAllocating(true);
    const hide = message.loading("正在為整張領料單進行智慧 FIFO 自動配料中...", 0);
    
    try {
      const updatedItems: any[] = [];
      
      for (const m of materialsList) {
        const isRoll = m.materialForm === "R";
        
        if (isRoll) {
          // 1. Roll (捲材) ➡️ FIFO 自動選配 rolls
          const res = await getApiV1WorkOrderRequisitionFifo({
            query: {
              materialCode: m.materialCode,
              requiredLength: m.requiredQuantity,
              requiredWidth: m.widthMm || undefined,
            } as any
          });
          
          const allocatedRolls = (res?.data as any)?.data || [];
          if (allocatedRolls.length > 0) {
            const totalLen = allocatedRolls.reduce((sum: number, r: any) => sum + r.qtyAux, 0);
            const totalArea = allocatedRolls.reduce((sum: number, r: any) => sum + r.qtyAux * (r.widthMm / 1000), 0);
            
            updatedItems.push({
              materialCode: m.materialCode,
              materialName: m.materialName || "",
              unit: "M",
              quantity: parseFloat(totalLen.toFixed(4)),
              referenceQuantity1: parseFloat(totalArea.toFixed(4)),
              sourceStorageCode: null,
              extra: allocatedRolls.map((r: any) => ({
                rollNo: r.rollNo,
                widthMm: r.widthMm,
                qtyAux: r.qtyAux,
              })),
            });
          }
        } else {
          // 2. Sheet (片材) ➡️ 邏輯庫存自動選配 specs
          const res = await getApiV1MaterialInventoryLogical({
            query: {
              materialCode: m.materialCode,
              pageSize: 100,
            } as any
          });
          
          const stockLines = (res?.data as any)?.list || [];
          let accumulated = 0;
          const selectedSpecs: any[] = [];
          const initialQtys: Record<string, number> = {};
          
          for (const line of stockLines) {
            if (accumulated >= m.requiredQuantity) break;
            
            const needed = m.requiredQuantity - accumulated;
            const take = Math.min(line.quantity || 0, needed);
            if (take > 0) {
              const specKey = `${line.widthMm}-${line.lengthMm || 0}`;
              initialQtys[specKey] = take;
              selectedSpecs.push({
                widthMm: line.widthMm,
                lengthMm: line.lengthMm || 0,
                thicknessMm: 0,
              });
              accumulated += take;
            }
          }
          
          if (selectedSpecs.length > 0) {
            let totalArea = 0;
            selectedSpecs.forEach((spec) => {
              const key = `${spec.widthMm}-${spec.lengthMm}`;
              const qty = initialQtys[key] || 0;
              totalArea += qty * (spec.widthMm / 1000) * (spec.lengthMm / 1000);
            });
            
            updatedItems.push({
              materialCode: m.materialCode,
              materialName: m.materialName || "",
              unit: "PCS",
              quantity: accumulated,
              referenceQuantity1: parseFloat(totalArea.toFixed(4)),
              sourceStorageCode: "TW-MAT-GEN",
              extra: selectedSpecs,
            });
          }
        }
      }
      
      if (updatedItems.length === 0) {
        message.warning("現有庫存不足以配出任何物料，配料完成但無新增項目！");
      } else {
        setItems(updatedItems);
        saveItemsDirectly(updatedItems);
        message.success(`⚡ 一鍵智慧配料完成！自動配出 ${updatedItems.length} 種物料。`);
      }
    } catch (err: any) {
      message.error("一鍵配料失敗：" + (err?.message || err));
    } finally {
      hide();
      setIsAutoAllocating(false);
    }
  };

  // 1. 取得該製令的領料單列表 (1對1，此處拿第一筆)
  const { data: requisitionsResponse, isLoading: listLoading, refetch: refetchList } = useQuery({
    queryKey: ["requisitions", masterData.workOrderNumber],
    queryFn: () => getApiV1WorkOrderRequisitionWoByWorkOrderNumber({
      path: { workOrderNumber: masterData.workOrderNumber! },
    }),
    enabled: !!masterData.workOrderNumber,
  });

  const requisitionList = (requisitionsResponse?.data as any)?.data || [];
  const activeDocNo = requisitionList.length > 0 ? requisitionList[0].documentNumber : null;

  // 2. 取得單據詳情
  const { data: detailResponse, isLoading: detailLoading, refetch: refetchDetail } = useQuery({
    queryKey: ["requisition", activeDocNo],
    queryFn: () => getApiV1WorkOrderRequisitionByDocumentNumber({ path: { documentNumber: activeDocNo! } }),
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
          sourceStorageCode: it.sourceStorageCode || "TW-MAT-GEN",
          notes: it.notes || "",
          extra,
        };
      });
      setItems(mappedItems);
    }
  }, [activeRecord]);

  // 3. Mutations
  const createMutation = useMutation({
    mutationFn: (values: any) => postApiV1WorkOrderRequisition({ body: values }),
    onSuccess: () => {
      message.success("領料單建立成功！");
      queryClient.invalidateQueries({ queryKey: ["requisitions", masterData.workOrderNumber] });
      justCreatedRef.current = true; // 💡 標記為剛建立，保留編輯狀態
      setIsCreating(false);
      setIsHeaderEditing(true); // 💡 建立成功後，自動進入編輯狀態，以便新增明細
      refetchList();
    },
    onError: (error) => {
      modal.error({ title: "建立失敗", content: getApiErrorMessage(error), centered: true });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (values: any) => putApiV1WorkOrderRequisitionByDocumentNumber({ path: { documentNumber: activeDocNo! }, body: values }),
    onSuccess: () => {
      message.success("儲存修改成功！");
      queryClient.invalidateQueries({ queryKey: ["requisition", activeDocNo] });
      queryClient.invalidateQueries({ queryKey: ["requisitions", masterData.workOrderNumber] });
      setIsHeaderEditing(false);
      refetchDetail();
      refetchList();
    },
    onError: (error) => {
      modal.error({ title: "儲存失敗", content: getApiErrorMessage(error), centered: true });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteApiV1WorkOrderRequisitionByDocumentNumber({ path: { documentNumber: activeDocNo! } }),
    onSuccess: () => {
      message.success("領料單刪除成功");
      queryClient.invalidateQueries({ queryKey: ["requisitions", masterData.workOrderNumber] });
      setIsCreating(false);
      refetchList();
    },
    onError: (error) => {
      modal.error({ title: "刪除失敗", content: getApiErrorMessage(error), centered: true });
    },
  });

  const confirmMutation = useMutation({
    mutationFn: () => postApiV1WorkOrderRequisitionByDocumentNumberConfirm({ path: { documentNumber: activeDocNo! } }),
    onSuccess: () => {
      message.success("領料過帳確認成功！一卷一卡已流轉至 WIP 狀態");
      queryClient.invalidateQueries({ queryKey: ["requisition", activeDocNo] });
      queryClient.invalidateQueries({ queryKey: ["requisitions", masterData.workOrderNumber] });
      refetchDetail();
      refetchList();
    },
    onError: (error) => {
      modal.error({ title: "過帳失敗", content: getApiErrorMessage(error), centered: true });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => postApiV1WorkOrderRequisitionByDocumentNumberCancel({ path: { documentNumber: activeDocNo! } }),
    onSuccess: () => {
      message.success("取消領料過帳成功！WIP 卷料已安全退回倉庫");
      queryClient.invalidateQueries({ queryKey: ["requisition", activeDocNo] });
      queryClient.invalidateQueries({ queryKey: ["requisitions", masterData.workOrderNumber] });
      refetchDetail();
      refetchList();
    },
    onError: (error) => {
      modal.error({ title: "取消失敗", content: getApiErrorMessage(error), centered: true });
    },
  });

  const handleConfirmPost = () => {
    if (items.length === 0) {
      message.warning("此領料單尚無任何明細項目，請先編輯並點選下方「新增領用物料」加入項目！");
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
        message.warning(`物料 ${it.materialCode} 的領用數量必須大於 0！`);
        return;
      }
    }

    const savedDate = formValues.documentDate ? dayjs(formValues.documentDate) : docDate;
    const savedNotes = formValues.notes || "";

    const postData = {
      referenceNumber: masterData.workOrderNumber!,
      documentDate: savedDate.format("YYYY-MM-DD"),
      notes: savedNotes || "",
      items: items.map((it) => ({
        materialCode: it.materialCode,
        sourceStorageCode: it.sourceStorageCode,
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
      sourceStorageCode: "TW-MAT-GEN",
      quantity: 0,
      referenceQuantity1: 0,
      bomRequiredWidth: 0,
    });
    setModalExtra([]);
    setSheetDrawQty({});
    setItemModalOpen(true);
  };

  const handleEditItemClick = (index: number) => {
    const it = items[index];
    setEditingItemIndex(index);
    const matched = materialsList.find((x) => x.materialCode === it.materialCode);
    setModalFormValues({
      materialCode: it.materialCode,
      sourceStorageCode: it.sourceStorageCode,
      quantity: it.quantity,
      referenceQuantity1: it.referenceQuantity1,
      bomRequiredWidth: matched?.widthMm || 0,
    });
    setModalExtra(it.extra || []);
    
    // 💡 If sheet material, initialize sheetDrawQty with the existing quantity!
    const isRoll = matched ? matched.materialForm === "R" : it.unit === "M";
    if (!isRoll && it.extra && it.extra.length > 0) {
      const initialQtys: Record<string, number> = {};
      it.extra.forEach((spec: any) => {
        initialQtys[`${spec.widthMm}-${spec.lengthMm}`] = it.quantity || 0;
      });
      setSheetDrawQty(initialQtys);
    } else {
      setSheetDrawQty({});
    }

    setItemModalOpen(true);
  };

  const saveItemsDirectly = (newItems: any[]) => {
    const postData = {
      referenceNumber: masterData.workOrderNumber!,
      documentDate: docDate.format("YYYY-MM-DD"),
      notes: docNotes || "",
      items: newItems.map((it) => ({
        materialCode: it.materialCode,
        sourceStorageCode: it.sourceStorageCode,
        notes: it.notes,
        extraDataJson: JSON.stringify(it.extra),
      })),
    };
    updateMutation.mutate(postData);
  };

  const handleRemoveItem = (index: number) => {
    modal.confirm({
      title: "確認刪除",
      content: `確定要刪除物料 ${items[index]?.materialCode} 的領用明細嗎？`,
      okText: "確認",
      cancelText: "取消",
      centered: true,
      onOk: () => {
        const updated = [...items];
        updated.splice(index, 1);
        setItems(updated);
        saveItemsDirectly(updated);
      }
    });
  };





  const handleModalSave = () => {
    if (!modalFormValues.materialCode) {
      message.warning("請先選取領用原料料號！");
      return;
    }
    if (modalFormValues.quantity <= 0) {
      message.warning("領用數量必須大於 0！");
      return;
    }

    const matched = materialsList.find((x) => x.materialCode === modalFormValues.materialCode);
    const requiredQty = matched ? matched.requiredQuantity : 0;
    if (modalFormValues.quantity < requiredQty) {
      message.warning(`領用數量不足！目前選擇/輸入的使用量為 ${modalFormValues.quantity}，必須大於等於計算後的需求量 ${requiredQty}！`);
      return;
    }

    const mappedExtra = modalExtra.length > 0
      ? modalExtra.map((el) => ({
          ...el,
          estimatedUnitPrice: modalFormValues.estimatedUnitPrice || 0,
          estimatedTotalCost: modalFormValues.estimatedTotalCost || 0,
        }))
      : [{
          estimatedUnitPrice: modalFormValues.estimatedUnitPrice || 0,
          estimatedTotalCost: modalFormValues.estimatedTotalCost || 0,
        }];

    const newItem = {
      materialCode: modalFormValues.materialCode,
      materialName: matched?.materialName || "",
      unit: matched?.materialForm === "R" ? "M" : "PCS",
      quantity: modalFormValues.quantity,
      referenceQuantity1: modalFormValues.referenceQuantity1,
      sourceStorageCode: (matched?.materialForm === "R" || (matched?.materialCode || "").startsWith("R-")) ? null : "TW-MAT-GEN",
      extra: mappedExtra,
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
          widthMm: x.materialWidth,
          requiredQuantity: form === "R" ? (x.totalLength || 0) : (x.requiredAmount || 0),
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
    { title: "原料料號", dataIndex: "materialCode", key: "materialCode", width: 160 },
    { title: "原料名稱", dataIndex: "materialName", key: "materialName", width: 220 },
    {
      title: "寬度規格 (mm)",
      key: "widthMm",
      width: 120,
      render: (_: any, record: any) => {
        const matched = materialsList.find((x) => x.materialCode === record.materialCode);
        return matched?.widthMm ? `${matched.widthMm} mm` : "-";
      }
    },
    { title: "單位", dataIndex: "unit", key: "unit", width: 80 },
    { title: "領用數量", dataIndex: "quantity", key: "quantity", width: 120, render: (v: number) => <strong>{v}</strong> },
    { title: "領用面積(SQM)", dataIndex: "referenceQuantity1", key: "referenceQuantity1", width: 140, render: (v: number) => v?.toFixed(4) },
    {
      title: "實物卡追溯 / 片材規格",
      key: "details",
      width: 250,
      render: (_: any, record: any) => {
        const matched = materialsList.find((x) => x.materialCode === record.materialCode);
        const isRoll = matched ? matched.materialForm === "R" : record.unit === "M";
        if (isRoll) {
          const hasExtra = record.extra && record.extra.length > 0;
          const tooltipContent = hasExtra ? (
            <div className="p-1 space-y-1">
              <div className="font-bold border-b border-gray-600 pb-1 mb-1">
                已選卷卡清單 ({record.extra.length} 卷)
              </div>
              {record.extra.map((r: any, idx: number) => (
                <div key={idx} className="text-xs">
                  {idx + 1}. <strong className="text-blue-400">{r.rollNo}</strong> : {r.qtyAux} M ({r.widthMm} mm)
                </div>
              ))}
            </div>
          ) : null;

          return (
            <Tooltip title={tooltipContent} overlayStyle={{ maxWidth: 300 }}>
              <div style={{ cursor: hasExtra ? "pointer" : "default" }}>
                <Tag color="cyan">捲材</Tag>
                {hasExtra ? (
                  <span className="text-xs text-blue-400 underline">已選 {record.extra.length} 卷 LPN (懸停查看)</span>
                ) : (
                  <span className="text-xs text-red-400">尚未選擇任何卷卡</span>
                )}
              </div>
            </Tooltip>
          );
        } else {
          const spec = record.extra?.[0] || {};
          return (
            <div>
              <Tag color="purple">片材</Tag>
              <span className="text-xs text-gray-400">
                規格: {spec.widthMm || 0}x{spec.lengthMm || 0}mm (厚: {spec.thicknessMm || 0}mm)
              </span>
            </div>
          );
        }
      },
    },
  ];

  const matchedMaterial = materialsList.find((x) => x.materialCode === modalFormValues.materialCode);
  const modalIsRoll = matchedMaterial ? matchedMaterial.materialForm === "R" : modalFormValues.unit === "M";

  const { data: selectableRollsResponse, isLoading: selectableRollsLoading } = useQuery({
    queryKey: ["selectable-rolls-modal", modalFormValues.materialCode, matchedMaterial?.widthMm],
    queryFn: () => getApiV1WorkOrderRequisitionSelectableRolls({
      query: {
        materialCode: modalFormValues.materialCode,
        requiredWidth: matchedMaterial?.widthMm || undefined,
      } as any
    }),
    enabled: itemModalOpen && modalIsRoll && !!modalFormValues.materialCode,
  });

  const selectableRollsList = (selectableRollsResponse?.data as any)?.data || [];

  const { data: logicalInventoryResponse, isLoading: logicalInventoryLoading } = useQuery({
    queryKey: ["logical-inventory-modal", modalFormValues.materialCode],
    queryFn: () => getApiV1MaterialInventoryLogical({
      query: {
        materialCode: modalFormValues.materialCode,
        pageSize: 100,
      } as any
    }),
    enabled: itemModalOpen && !modalIsRoll && !!modalFormValues.materialCode,
  });

  const logicalInventoryList = (logicalInventoryResponse?.data as any)?.list || [];

  return (
    <div className="flex flex-col gap-4">
      <Spin spinning={listLoading || detailLoading}>
        {!showHeaderForm ? (
          <Empty
            description="尚未建立領料表"
            className="mt-10"
          >
            <Button type="primary" onClick={handleCreateNewClick}>
              產生領料單
            </Button>
          </Empty>
        ) : (
          <div className="flex flex-col gap-4">
            {/* 領料單表頭 採用 DynamicForm 架構 */}
            <Card
              size="small"
              title={
                <Space>
                  <strong>{isCreating ? "新增領料單" : `📄 領料單 - ${activeDocNo}`}</strong>
                  {activeRecord && (
                    activeRecord.confirmDate ? (
                      <Tag color="success">🟢 已確認過帳</Tag>
                    ) : (
                      <Tag color="default">⚪ 草稿 (Draft)</Tag>
                    )
                  )}
                </Space>
              }
              extra={
                <Space>
                  {isEditable ? (
                    <>
                      <Button type="primary" size="small" icon={<SaveOutlined />} onClick={() => (document.getElementById("requisitionHeaderForm") as HTMLFormElement)?.requestSubmit()} loading={createMutation.isPending || updateMutation.isPending}>
                        儲存草稿
                      </Button>
                      <Button size="small" onClick={() => (isCreating ? setIsCreating(false) : setIsHeaderEditing(false))}>
                        取消
                      </Button>
                    </>
                  ) : (
                    <>
                      {!isPosted && (
                        <>
                          <Button type="primary" size="small" icon={<EditOutlined />} onClick={() => setIsHeaderEditing(true)}>
                            編輯
                          </Button>
                          <Button type="primary" size="small" className="bg-green-600 hover:bg-green-700 border-green-600" icon={<CheckCircleOutlined />} onClick={handleConfirmPost} loading={confirmMutation.isPending}>
                            確認過帳
                          </Button>
                          <Button danger size="small" icon={<DeleteOutlined />} onClick={() => {
                            modal.confirm({
                              title: "刪除確認",
                              content: "確定要刪除這張領料單草稿嗎？此操作不可逆。",
                              centered: true,
                              onOk: () => deleteMutation.mutate(),
                            });
                          }} loading={deleteMutation.isPending}>
                            刪除
                          </Button>
                        </>
                      )}
                      {isPosted && (
                        <Button danger size="small" icon={<SyncOutlined />} onClick={() => {
                          modal.confirm({
                            title: "取消過帳確認",
                            content: "確定要取消此領料單過帳嗎？這會把 WIP 卷卡重新退回倉庫 Available 狀態。",
                            centered: true,
                            onOk: () => cancelMutation.mutate(),
                          });
                        }} loading={cancelMutation.isPending}>
                          取消領料過帳
                        </Button>
                      )}
                    </>
                  )}
                </Space>
              }
            >
              <DynamicForm
                formId="requisitionHeaderForm"
                fields={requisitionHeaderFormConfig() as any}
                defaultValues={{
                  plannedQuantity: masterData.plannedQuantity || 0,
                  documentDate: docDate as any,
                  notes: docNotes,
                }}
                onSubmit={handleSave}
                isViewMode={!isEditable}
                hideDefaultFooter={true}
              />
            </Card>

            {/* 領料明細面板 採用與 BOM 一致 the Table & Modal 編輯架構 */}
            <Card
              size="small"
              title={<strong>📋 領料物料明細</strong>}
              extra={
                !isPosted && activeDocNo && (
                  <Space>
                    <Button
                      type="default"
                      size="small"
                      icon={<SyncOutlined spin={isAutoAllocating} />}
                      onClick={handleAutoAllocateAll}
                      loading={isAutoAllocating}
                    >
                      ⚡ 一鍵自動配料
                    </Button>
                    <Button
                      type="primary"
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={handleAddNewItemClick}
                    >
                      新增領用物料
                    </Button>
                  </Space>
                )
              }
            >
              <Table
                size="small"
                dataSource={items}
                columns={itemColumns}
                pagination={false}
                scroll={{ x: 1000 }}
                rowKey="materialCode"
                locale={{
                  emptyText: !activeDocNo
                    ? "⚠️ 請先點擊右上方「儲存草稿」保存表頭，即可開始新增領用物料明細。"
                    : "尚未加入任何領用物料項目，請點選右上方新增項目。"
                }}
              />
            </Card>
          </div>
        )}
      </Spin>

      {/* 領料明細項目編輯彈窗 採用 DynamicForm 架構 */}
      {itemModalOpen && (
        <Modal
          title={editingItemIndex !== null ? "編輯領用原料" : "新增領用原料"}
          open={itemModalOpen}
          onCancel={() => setItemModalOpen(false)}
          okText="確定"
          cancelText="取消"
          onOk={handleModalSave}
          width="65vw"
          styles={{
            body: {
              maxHeight: "calc(90vh - 130px)",
              overflowY: "hidden",
              overflowX: "hidden",
              paddingRight: "4px",
            }
          }}
          destroyOnClose
        >
          <div className="py-4 space-y-4">
            {/* 💡 計算後需求量展示區 */}
            {matchedMaterial && (
              <div className="text-sm text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-950/30 p-3 rounded-md border border-blue-200 dark:border-blue-900/50">
                💡 計算後原料需求量：{matchedMaterial.requiredQuantity} {matchedMaterial.materialForm === 'R' ? 'M' : 'PCS'}
              </div>
            )}

            <DynamicForm
              formId="requisitionItemForm"
              fields={requisitionItemFormConfig(materialsList).map((f) => {
                // 💡 Lock quantity from being manually typed for BOTH rolls and sheets!
                if (f.name === "quantity") {
                  return { ...f, editable: "never" };
                }
                return f;
              }) as any}
              defaultValues={{
                materialCode: modalFormValues.materialCode,
                quantity: modalFormValues.quantity,
                referenceQuantity1: modalFormValues.referenceQuantity1,
                bomRequiredWidth: modalFormValues.bomRequiredWidth,
              }}
              onSubmit={() => {}}
              onValuesChange={(values: any) => {
                // 💡 僅需監聽手動選取的原料料號 (materialCode) 變化
                // 唯讀欄位 (quantity / referenceQuantity1) 是由 Parent 狀態向下單向驅動同步的，不需重複向上反饋
                if (values.materialCode !== modalFormValues.materialCode) {
                  const matched = materialsList.find((x) => x.materialCode === values.materialCode);
                  const updatedValues = {
                    ...modalFormValues,
                    materialCode: values.materialCode,
                    quantity: 0,
                    referenceQuantity1: 0,
                    bomRequiredWidth: matched?.widthMm || 0,
                  };

                  setModalExtra([]);
                  setSheetDrawQty({});
                  setModalFormValues(updatedValues);
                }
              }}
              isViewMode={false}
              hideDefaultFooter={true}
            />

            {/* 捲材：一卷一卡 LPN 卷卡選擇區 */}
            {modalIsRoll && modalFormValues.materialCode && (
              <div className="bg-[var(--ant-color-fill-alter)] p-4 rounded-md mt-4 border border-[var(--ant-color-border-secondary)] requisition-modal-table">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold text-[var(--ant-color-text-secondary)]">
                    🌀 捲材實體卡候選清單 (已選 {modalExtra?.length || 0} 卷，總長度: {modalFormValues.quantity || 0} M)
                  </span>
                  <Button
                    type="primary"
                    ghost
                    size="small"
                    icon={<SyncOutlined spin={isAutoAllocating} />}
                    onClick={async () => {
                      if (!modalFormValues.materialCode) return;
                      const hide = message.loading("正在進行智慧 FIFO 自動配料...", 0);
                      try {
                        const res = await getApiV1WorkOrderRequisitionFifo({
                          query: {
                            materialCode: modalFormValues.materialCode,
                            requiredLength: matchedMaterial?.requiredQuantity || 0,
                            requiredWidth: matchedMaterial?.widthMm || undefined,
                          } as any
                        });
                        const allocatedRolls = (res?.data as any)?.data || [];
                        if (allocatedRolls.length > 0) {
                          const mappedExtra = allocatedRolls.map((r: any) => ({
                            rollNo: r.rollNo,
                            widthMm: r.widthMm,
                            qtyAux: r.qtyAux,
                          }));
                          setModalExtra(mappedExtra);
                          const totalLen = mappedExtra.reduce((sum: number, r: any) => sum + r.qtyAux, 0);
                          const totalArea = mappedExtra.reduce((sum: number, r: any) => sum + r.qtyAux * (r.widthMm / 1000), 0);
                          
                          setModalFormValues((prev: any) => ({
                            ...prev,
                            quantity: parseFloat(totalLen.toFixed(4)),
                            referenceQuantity1: parseFloat(totalArea.toFixed(4)),
                          }));
                          message.success(`智慧配料完成！自動選取 ${allocatedRolls.length} 卷物料滿足生產需求。`);
                        } else {
                          message.warning("現有 LPN 庫存不足，無法配出足夠物料！");
                        }
                      } catch (err: any) {
                        message.error("自動配料失敗：" + (err?.message || err));
                      } finally {
                        hide();
                      }
                    }}
                  >
                    智慧自動配料
                  </Button>
                </div>
                <Table
                  size="small"
                  loading={selectableRollsLoading}
                  dataSource={selectableRollsList}
                  rowSelection={{
                    type: "checkbox",
                    selectedRowKeys: modalExtra.map((x: any) => x.rollNo),
                    onChange: (_, selectedRows: any[]) => {
                      const validKeys: React.Key[] = [];
                      const validRows: any[] = [];
                      selectedRows.forEach((row) => {
                        if (row.matchStatus !== "Narrower") {
                          validKeys.push(row.rollNo);
                          validRows.push(row);
                        } else {
                          message.warning(`物料卡 ${row.rollNo} 寬度不足，無法領用！`);
                        }
                      });
                      
                      const mappedExtra = validRows.map((r) => ({
                        rollNo: r.rollNo,
                        widthMm: r.widthMm,
                        qtyAux: r.currentQtyAux,
                      }));
                      setModalExtra(mappedExtra);
                      const totalLen = mappedExtra.reduce((sum: number, r: any) => sum + r.qtyAux, 0);
                      const totalArea = mappedExtra.reduce((sum: number, r: any) => sum + r.qtyAux * (r.widthMm / 1000), 0);
                      
                      setModalFormValues((prev: any) => ({
                        ...prev,
                        quantity: parseFloat(totalLen.toFixed(4)),
                        referenceQuantity1: parseFloat(totalArea.toFixed(4)),
                      }));
                    }
                  }}
                  rowKey="rollNo"
                  pagination={false}
                  scroll={selectableRollsList.length > 5 ? { y: 250 } : undefined}
                  columns={[
                    { title: "物料卡號 (LPN)", dataIndex: "rollNo", key: "rollNo", width: 160 },
                    { title: "批次號", dataIndex: "lotNo", key: "lotNo", width: 110 },
                    { title: "剩餘長度 (M)", dataIndex: "currentQtyAux", key: "currentQtyAux", width: 100, render: (v) => <strong>{v} M</strong> },
                    { title: "寬度 (mm)", dataIndex: "widthMm", key: "widthMm", width: 90, render: (v) => `${v} mm` },
                    { title: "厚度 (mm)", dataIndex: "measuredThicknessMm", key: "measuredThicknessMm", width: 90, render: (v) => v != null ? `${v} mm` : "-" },
                    {
                      title: "匹配判定",
                      dataIndex: "matchStatus",
                      key: "matchStatus",
                      width: 130,
                      render: (status: string) => {
                        if (status === "Exact") {
                          return <Tag color="success">🟢 完全符合 (Exact)</Tag>;
                        } else if (status === "Wider") {
                          return <Tag color="orange">🟡 寬度替代 (Wider)</Tag>;
                        } else {
                          return <Tag color="error">🔴 寬度不足 (窄)</Tag>;
                        }
                      },
                    },
                  ]}
                />
              </div>
            )}

            {/* 片材：庫存規格選擇區 */}
            {!modalIsRoll && modalFormValues.materialCode && (
              <div className="bg-[var(--ant-color-fill-alter)] p-4 rounded-md mt-4 border border-[var(--ant-color-border-secondary)] requisition-modal-table">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold text-[var(--ant-color-text-secondary)]">
                    🔮 片材庫存規格清單 (已選規格 {modalExtra?.length || 0} 筆，總數量: {modalFormValues.quantity || 0} PCS)
                  </span>
                  <Button
                    type="primary"
                    ghost
                    size="small"
                    icon={<SyncOutlined spin={isAutoAllocating} />}
                    onClick={() => {
                      if (logicalInventoryList.length === 0) {
                        message.warning("現有庫存無規格行，無法進行自動配料！");
                        return;
                      }
                      const targetQty = matchedMaterial?.requiredQuantity || 0;
                      if (targetQty <= 0) {
                        message.warning("需求量為 0，無需進行配料！");
                        return;
                      }
                      
                      let accumulated = 0;
                      const selectedSpecs: any[] = [];
                      const updatedDrawQty = { ...sheetDrawQty };
                      
                      for (const record of logicalInventoryList) {
                        if (accumulated >= targetQty) break;
                        const key = `${record.widthMm}-${record.lengthMm || 0}`;
                        const lineQty = record.quantity || 0;
                        if (lineQty > 0) {
                          const needed = targetQty - accumulated;
                          const take = Math.min(lineQty, needed);
                          updatedDrawQty[key] = take;
                          selectedSpecs.push({
                            widthMm: record.widthMm,
                            lengthMm: record.lengthMm || 0,
                            thicknessMm: 0,
                          });
                          accumulated += take;
                        }
                      }
                      
                      setSheetDrawQty(updatedDrawQty);
                      setModalExtra(selectedSpecs);
                      
                      let totalQty = 0;
                      let totalArea = 0;
                      selectedSpecs.forEach((spec) => {
                        const key = `${spec.widthMm}-${spec.lengthMm}`;
                        const qty = updatedDrawQty[key] || 0;
                        totalQty += qty;
                        totalArea += qty * (spec.widthMm / 1000) * (spec.lengthMm / 1000);
                      });
                      
                      setModalFormValues((prev: any) => ({
                        ...prev,
                        quantity: totalQty,
                        referenceQuantity1: parseFloat(totalArea.toFixed(4)),
                      }));
                      
                      if (accumulated >= targetQty) {
                        message.success(`智慧配料完成！自動選取 ${selectedSpecs.length} 個規格行以滿足生產需求。`);
                      } else {
                        message.warning(`現有庫存不足！自動配出 ${accumulated} PCS，尚缺 ${targetQty - accumulated} PCS！`);
                      }
                    }}
                  >
                    智慧自動配料
                  </Button>
                </div>
                <Table
                  size="small"
                  loading={logicalInventoryLoading}
                  dataSource={logicalInventoryList}
                  rowSelection={{
                    type: "checkbox",
                    selectedRowKeys: modalExtra.map((x: any) => `${x.widthMm}-${x.lengthMm}`),
                    onChange: (_, selectedRows: any[]) => {
                      const mappedExtra = selectedRows.map((r) => ({
                        widthMm: r.widthMm,
                        lengthMm: r.lengthMm || 0,
                        thicknessMm: 0,
                      }));
                      setModalExtra(mappedExtra);
                      
                      let totalQty = 0;
                      let totalArea = 0;
                      mappedExtra.forEach((spec) => {
                        const key = `${spec.widthMm}-${spec.lengthMm}`;
                        const qty = sheetDrawQty[key] || 0;
                        totalQty += qty;
                        totalArea += qty * (spec.widthMm / 1000) * (spec.lengthMm / 1000);
                      });
                      
                      setModalFormValues((prev: any) => ({
                        ...prev,
                        quantity: totalQty,
                        referenceQuantity1: parseFloat(totalArea.toFixed(4)),
                      }));
                    }
                  }}
                  rowKey={(record: any) => `${record.widthMm}-${record.lengthMm}`}
                  pagination={false}
                  scroll={logicalInventoryList.length > 5 ? { y: 250 } : undefined}
                  columns={[
                    { title: "寬度 (mm)", dataIndex: "widthMm", key: "widthMm", render: (v) => `${v} mm` },
                    { title: "長度 (mm)", dataIndex: "lengthMm", key: "lengthMm", render: (v) => v ? `${v} mm` : "-" },
                    { title: "現有庫存量", dataIndex: "quantity", key: "quantity", render: (v) => <strong>{v?.toLocaleString()} PCS</strong> },
                    {
                      title: "領用數量 (PCS)",
                      key: "drawQty",
                      width: 150,
                      render: (_, record: any) => {
                        const key = `${record.widthMm}-${record.lengthMm}`;
                        return (
                          <InputNumber
                            size="small"
                            min={0}
                            max={record.quantity}
                            value={sheetDrawQty[key] || 0}
                            onChange={(val) => {
                              const qty = val || 0;
                              const updatedDrawQty = { ...sheetDrawQty, [key]: qty };
                              setSheetDrawQty(updatedDrawQty);
                              
                              let updatedExtra = [...modalExtra];
                              const exists = updatedExtra.some((x: any) => x.widthMm === record.widthMm && x.lengthMm === record.lengthMm);
                              if (qty > 0 && !exists) {
                                updatedExtra.push({
                                  widthMm: record.widthMm,
                                  lengthMm: record.lengthMm || 0,
                                  thicknessMm: 0,
                                });
                                setModalExtra(updatedExtra);
                              } else if (qty === 0 && exists) {
                                updatedExtra = updatedExtra.filter((x: any) => !(x.widthMm === record.widthMm && x.lengthMm === record.lengthMm));
                                setModalExtra(updatedExtra);
                              }
                              
                              let totalQty = 0;
                              let totalArea = 0;
                              updatedExtra.forEach((spec) => {
                                const specKey = `${spec.widthMm}-${spec.lengthMm}`;
                                const dQty = updatedDrawQty[specKey] || 0;
                                totalQty += dQty;
                                totalArea += dQty * (spec.widthMm / 1000) * (spec.lengthMm / 1000);
                              });
                              
                              setModalFormValues((prev: any) => ({
                                ...prev,
                                quantity: totalQty,
                                referenceQuantity1: parseFloat(totalArea.toFixed(4)),
                              }));
                            }}
                          />
                        );
                      }
                    }
                  ]}
                />
              </div>
            )}

            {/* 💡 Scope style block to override page-level max-height: none !important */}
            <style>{`
              .requisition-modal-table .ant-table-body {
                max-height: 250px !important;
                overflow-y: auto !important;
              }
            `}</style>
          </div>
        </Modal>
      )}
    </div>
  );
}
