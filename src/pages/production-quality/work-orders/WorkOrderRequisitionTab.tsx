import { useState, useEffect, useRef } from "react";
import { Card, Table, Tag, Space, Button, Empty, App, Spin, Modal, InputNumber } from "antd";
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
  getApiV1WorkOrderRequisitionFifo
} from "@/api/generated/sdk.gen";
import { getApiErrorMessage } from "@/utils/apiError";
import dayjs from "dayjs";
import { RollSubstitutionPicker } from "./RollSubstitutionPicker";
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
  const [pickerOpen, setPickerOpen] = useState(false);

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
          sourceStorageCode: it.sourceStorageCode || "TW-GEN-INV",
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

  // 💡 FIFO 自動配料一鍵完成
  const handleFifoAutoAllocate = async (requiredQty: number, widthMm: number) => {
    const materialCode = modalFormValues.materialCode;
    if (!materialCode) {
      message.warning("請先選定原料料號！");
      return;
    }
    if (!requiredQty || requiredQty <= 0) {
      message.warning("請先輸入所需長度，再點擊 FIFO 配料！");
      return;
    }
    try {
      const res: any = await getApiV1WorkOrderRequisitionFifo({
        query: {
          materialCode,
          requiredLength: requiredQty,
          requiredWidth: widthMm || undefined,
        } as any
      });
      const allocated = res.data?.data || [];
      if (allocated.length === 0) {
        message.error("原料倉庫中無足夠的可用 LPN 卷卡可供 FIFO 配料！");
        return;
      }

      setModalExtra(allocated);
      const totalLen = allocated.reduce((sum: number, r: any) => sum + r.qtyAux, 0);
      const totalArea = allocated.reduce((sum: number, r: any) => sum + r.qtyAux * (r.widthMm / 1000), 0);

      setModalFormValues((prev: any) => ({
        ...prev,
        quantity: totalLen,
        referenceQuantity1: parseFloat(totalArea.toFixed(4)),
      }));

      message.success(`FIFO 自動配料成功！共為您選中了 ${allocated.length} 卷可用卷卡`);
    } catch (e) {
      message.error("自動配料失敗：" + getApiErrorMessage(e));
    }
  };

  const handleAddNewItemClick = () => {
    setEditingItemIndex(null);
    setModalFormValues({
      materialCode: "",
      sourceStorageCode: "TW-GEN-INV",
      quantity: 0,
      referenceQuantity1: 0,
    });
    setModalExtra([]);
    setItemModalOpen(true);
  };

  const handleEditItemClick = (index: number) => {
    const it = items[index];
    setEditingItemIndex(index);
    setModalFormValues({
      materialCode: it.materialCode,
      sourceStorageCode: it.sourceStorageCode,
      quantity: it.quantity,
      referenceQuantity1: it.referenceQuantity1,
    });
    setModalExtra(it.extra || []);
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
    const updated = [...items];
    updated.splice(index, 1);
    setItems(updated);
    saveItemsDirectly(updated);
  };

  const handleSheetSpecChange = (field: string, val: number) => {
    const spec = modalExtra[0] || { widthMm: 0, lengthMm: 0, thicknessMm: 0 };
    spec[field] = val;
    const updatedExtra = [spec];
    setModalExtra(updatedExtra);

    const qty = modalFormValues.quantity || 0;
    const area = (spec.widthMm / 1000) * (spec.lengthMm / 1000) * qty;

    setModalFormValues((prev: any) => ({
      ...prev,
      referenceQuantity1: parseFloat(area.toFixed(4)),
    }));
  };

  const handleRollsSelected = (selectedRolls: any[]) => {
    const mappedExtra = selectedRolls.map((r) => ({
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
    const newItem = {
      materialCode: modalFormValues.materialCode,
      materialName: matched?.materialName || "",
      unit: matched?.materialForm === "R" ? "M" : "PCS",
      quantity: modalFormValues.quantity,
      referenceQuantity1: modalFormValues.referenceQuantity1,
      sourceStorageCode: modalFormValues.sourceStorageCode,
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

  const materialsList = Array.isArray(masterData.items)
    ? masterData.items.map((x: any) => ({
        materialCode: x.materialCode,
        materialName: x.materialName,
        materialForm: x.materialForm,
        widthMm: x.materialWidth,
      }))
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
    { title: "原料料號", dataIndex: "materialCode", key: "materialCode" },
    { title: "原料名稱", dataIndex: "materialName", key: "materialName" },
    { title: "單位", dataIndex: "unit", key: "unit", width: 80 },
    { title: "領用數量", dataIndex: "quantity", key: "quantity", width: 100, render: (v: number) => <strong>{v}</strong> },
    { title: "領用面積(SQM)", dataIndex: "referenceQuantity1", key: "referenceQuantity1", width: 140, render: (v: number) => v?.toFixed(4) },
    { title: "來源儲位", dataIndex: "sourceStorageCode", key: "sourceStorageCode", render: (v: string) => v === "TW-GEN-INV" ? "原料主倉" : "現場車間倉" },
    {
      title: "實物卡追溯 / 片材規格",
      key: "details",
      render: (_: any, record: any) => {
        const matched = materialsList.find((x) => x.materialCode === record.materialCode);
        const isRoll = matched ? matched.materialForm === "R" : record.unit === "M";
        if (isRoll) {
          return (
            <div>
              <Tag color="cyan">捲材</Tag>
              {record.extra && record.extra.length > 0 ? (
                <span className="text-xs text-gray-400">已選 {record.extra.length} 卷 LPN</span>
              ) : (
                <span className="text-xs text-red-400">尚未選擇任何卷卡</span>
              )}
            </div>
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
                  <Button
                    type="primary"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={handleAddNewItemClick}
                  >
                    新增領用物料
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
          width="60vw"
          destroyOnClose
        >
          <div className="py-4 space-y-4">
            <DynamicForm
              formId="requisitionItemForm"
              fields={requisitionItemFormConfig(materialsList) as any}
              defaultValues={{
                materialCode: modalFormValues.materialCode,
                sourceStorageCode: modalFormValues.sourceStorageCode,
                quantity: modalFormValues.quantity,
                referenceQuantity1: modalFormValues.referenceQuantity1,
              }}
              onSubmit={() => {}}
              onValuesChange={(values: any) => {
                const matched = materialsList.find((x) => x.materialCode === values.materialCode);
                const innerIsRoll = matched ? matched.materialForm === "R" : modalFormValues.unit === "M";

                // 比對是否有實質改變
                if (
                  values.materialCode !== modalFormValues.materialCode ||
                  values.sourceStorageCode !== modalFormValues.sourceStorageCode ||
                  values.quantity !== modalFormValues.quantity
                ) {
                  const updatedValues = {
                    ...modalFormValues,
                    materialCode: values.materialCode,
                    sourceStorageCode: values.sourceStorageCode,
                  };

                  if (values.materialCode !== modalFormValues.materialCode) {
                    // 原料料號改變，初始化 extra 欄位
                    updatedValues.quantity = 0;
                    updatedValues.referenceQuantity1 = 0;
                    setModalExtra(innerIsRoll ? [] : [{ widthMm: matched?.widthMm || 0, lengthMm: 0, thicknessMm: 0 }]);
                  } else if (!innerIsRoll) {
                    // 片材數量改變，重新計算面積
                    updatedValues.quantity = values.quantity || 0;
                    const spec = modalExtra[0] || { widthMm: matched?.widthMm || 0, lengthMm: 0, thicknessMm: 0 };
                    const area = (spec.widthMm / 1000) * (spec.lengthMm / 1000) * updatedValues.quantity;
                    updatedValues.referenceQuantity1 = parseFloat(area.toFixed(4));
                  } else {
                    // 捲材數量由下層 LPN 控制
                  }

                  setModalFormValues(updatedValues);
                }
              }}
              isViewMode={false}
              hideDefaultFooter={true}
            />

            {/* 捲材：一卷一卡 LPN 卷卡選擇區 */}
            {modalIsRoll && modalFormValues.materialCode && (
              <div className="bg-[var(--ant-color-fill-alter)] p-4 rounded-md mt-4 border border-[var(--ant-color-border-secondary)]">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold text-[var(--ant-color-text-secondary)]">
                    🌀 捲材實體卡追溯 LPN (已選 {modalExtra?.length || 0} 卷)
                  </span>
                  <Space>
                    <Button
                      size="small"
                      type="primary"
                      ghost
                      icon={<PlusOutlined />}
                      onClick={() => setPickerOpen(true)}
                    >
                      智慧挑選卷卡
                    </Button>
                    <InputNumber
                      size="small"
                      style={{ width: "120px" }}
                      placeholder="FIFO 需求(米)"
                      id="modal-fifo-input"
                    />
                    <Button
                      size="small"
                      type="dashed"
                      onClick={() => {
                        const reqLen = (document.getElementById("modal-fifo-input") as HTMLInputElement)?.value;
                        handleFifoAutoAllocate(parseFloat(reqLen), matchedMaterial?.widthMm || 0);
                      }}
                    >
                      一鍵 FIFO 配料
                    </Button>
                  </Space>
                </div>
                {modalExtra && modalExtra.length > 0 ? (
                  <Table
                    size="small"
                    dataSource={modalExtra}
                    pagination={false}
                    rowKey="rollNo"
                    columns={[
                      { title: "物料卷卡號 (LPN)", dataIndex: "rollNo", key: "rollNo" },
                      { title: "實體規格寬度", dataIndex: "widthMm", key: "widthMm", render: (v) => `${v} mm` },
                      { title: "領用長度 (M)", dataIndex: "qtyAux", key: "qtyAux", render: (v) => <strong>{v} M</strong> },
                    ]}
                  />
                ) : (
                  <div className="py-4 text-center text-[var(--ant-color-text-placeholder)] text-xs">
                    目前尚未選擇任何實體物料卷卡，請點選上方按鈕挑選！
                  </div>
                )}
              </div>
            )}

            {/* 片材：規格參數設定 */}
            {!modalIsRoll && modalFormValues.materialCode && (
              <div className="bg-[var(--ant-color-fill-alter)] p-4 rounded-md mt-4 border border-[var(--ant-color-border-secondary)]">
                <div className="text-xs font-bold text-[var(--ant-color-text-secondary)] mb-3">
                  🔮 片材規格參數設定
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-gray-400 block mb-1 text-xs">片料寬度 (mm)</label>
                    <InputNumber
                      style={{ width: "100%" }}
                      value={modalExtra[0]?.widthMm}
                      onChange={(val: any) => handleSheetSpecChange("widthMm", val || 0)}
                      size="small"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 block mb-1 text-xs">片料長度 (mm)</label>
                    <InputNumber
                      style={{ width: "100%" }}
                      value={modalExtra[0]?.lengthMm}
                      onChange={(val: any) => handleSheetSpecChange("lengthMm", val || 0)}
                      size="small"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 block mb-1 text-xs">厚度 (mm)</label>
                    <InputNumber
                      style={{ width: "100%" }}
                      value={modalExtra[0]?.thicknessMm}
                      onChange={(val: any) => handleSheetSpecChange("thicknessMm", val || 0)}
                      size="small"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* 智慧 LPN 卷卡選擇 Modal */}
      {pickerOpen && modalFormValues.materialCode && (
        <RollSubstitutionPicker
          visible={pickerOpen}
          materialCode={modalFormValues.materialCode}
          requiredWidth={matchedMaterial?.widthMm}
          selectedRollNos={modalExtra.map((x: any) => x.rollNo)}
          onCancel={() => setPickerOpen(false)}
          onSelect={(selectedRolls) => {
            handleRollsSelected(selectedRolls);
            setPickerOpen(false);
          }}
        />
      )}
    </div>
  );
}
